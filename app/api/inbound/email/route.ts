// app/api/inbound/email/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // raw body + avoid static optimization
export const maxDuration = 60; // allow a bit more time if needed

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { createHash, createHmac } from "node:crypto";

function b64(input: Buffer | string) {
  return Buffer.isBuffer(input)
    ? input.toString("base64")
    : Buffer.from(input).toString("base64");
}

/** Example Postmark-style HMAC check; adjust for your provider. */
function verifySignature(
  raw: string,
  signature: string | null,
  secret: string | undefined
) {
  if (!secret || !signature) return false;
  const mac = createHmac("sha256", secret).update(raw).digest("base64");
  // timing-safe compare
  return (
    mac.length === signature.length &&
    createHash("sha256").update(mac).digest("hex") ===
      createHash("sha256").update(signature).digest("hex")
  );
}

export async function POST(req: Request) {
  const raw = await req.text(); // raw body for signature
  const sig = req.headers.get("x-postmark-signature"); // adjust header for your provider
  const ok = verifySignature(raw, sig, process.env.POSTMARK_INBOUND_SECRET);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: any = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  // Minimal fields — adapt to your provider
  const to = (payload.ToFull?.[0]?.Email || payload.To || "").toLowerCase();
  const from = payload.FromFull?.Email || payload.From || null;
  const subj = payload.Subject || null;
  const text = payload.TextBody || payload.HtmlBody || "";
  const ts = payload.Date ? new Date(payload.Date) : new Date();
  const published_at = isNaN(ts.getTime())
    ? new Date().toISOString()
    : ts.toISOString();

  const admin = supabaseService();

  // find email source by alias
  const { data: src } = await admin
    .from("sources")
    .select("id, org_id, config")
    .eq("kind", "email")
    .ilike("config->>alias", to) // case-insensitive match of stored alias
    .maybeSingle();
  if (!src?.id)
    return NextResponse.json(
      { error: "No matching email source" },
      { status: 404 }
    );

  // external_id: stable dedupe key
  const external_id = createHash("sha256")
    .update(`${from ?? ""}|${subj ?? ""}|${published_at}|${text.slice(0, 500)}`)
    .digest("hex");

  const review = {
    org_id: src.org_id,
    source_id: src.id,
    external_id,
    author: from,
    title: subj,
    body: String(text),
    language: "en",
    published_at,
  };

  const { error: upErr } = await admin
    .from("reviews")
    .upsert(review, {
      onConflict: "org_id,source_id,external_id",
      ignoreDuplicates: true,
    });
  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 500 });

  // fire-and-forget analyze backfill (kept in a single heavy route)
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  fetch(`${base}/api/analyze`, {
    method: "POST",
    headers: { "x-internal-key": process.env.INTERNAL_SYNC_KEY || "" },
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
