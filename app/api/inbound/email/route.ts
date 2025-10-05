// app/api/inbound/email/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { createHash } from "node:crypto";
import { Webhook } from "svix";

export async function POST(req: Request) {
  // 1) Get raw body for signature verification
  const raw = await req.text();

  // 2) Verify Resend (Svix) signatures
  const svixId = req.headers.get("svix-id") ?? "";
  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const svixSignature = req.headers.get("svix-signature") ?? "";
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret || !svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing signature headers" },
      { status: 400 }
    );
  }

  let payload: any;
  try {
    const wh = new Webhook(secret);
    payload = wh.verify(raw, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (e) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3) Normalize fields (Resend inbound shape)
  const toEmail = (
    payload?.to?.[0]?.email ||
    payload?.to?.[0] ||
    payload?.to ||
    ""
  )
    .toString()
    .toLowerCase();

  const fromEmail = payload?.from?.email || payload?.from || null;

  const subject = payload?.subject ?? null;
  const text = payload?.text ?? payload?.html ?? "";

  const ts = payload?.date ? new Date(payload.date) : new Date();
  const published_at = isNaN(ts.getTime())
    ? new Date().toISOString()
    : ts.toISOString();

  const admin = supabaseService();

  // 4) Find matching “email” source by alias (your app logic)
  const { data: src } = await admin
    .from("sources")
    .select("id, org_id, config")
    .eq("kind", "email")
    .ilike("config->>alias", toEmail)
    .maybeSingle();

  if (!src?.id) {
    return NextResponse.json(
      { error: "No matching email source" },
      { status: 404 }
    );
  }

  // 5) Dedupe external_id
  const external_id = createHash("sha256")
    .update(
      `${fromEmail ?? ""}|${subject ?? ""}|${published_at}|${String(text).slice(
        0,
        500
      )}`
    )
    .digest("hex");

  const review = {
    org_id: src.org_id,
    source_id: src.id,
    external_id,
    author: fromEmail,
    title: subject,
    body: String(text),
    language: "en",
    published_at,
  };

  const { error: upErr } = await admin.from("reviews").upsert(review, {
    onConflict: "org_id,source_id,external_id",
    ignoreDuplicates: true,
  });

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // 6) Kick off async analyze
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "x-internal-key": process.env.INTERNAL_SYNC_KEY || "" },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
