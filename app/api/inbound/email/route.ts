// app/api/inbound/email/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { contentExternalId } from "@/lib/hash";
import {rateLimit} from "@/lib/rate-limits";

// --- tiny helpers ---
function verifyPostmark(raw: string, signature: string, secret: string) {
  const h = crypto.createHmac("sha256", secret);
  h.update(raw);
  const expected = h.digest("base64");
  return signature === expected;
}
function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
// MVP heuristics (same as /api/analyze)
function scoreFromText(text: string): number | null {
  const t = (text || "").toLowerCase();
  const pos = ["great","excellent","amazing","love","fast","friendly","clean","perfect","happy","recommend"];
  const neg = ["bad","poor","terrible","hate","slow","rude","dirty","broken","unhappy","refund","late","delay"];
  let s = 0; pos.forEach(w => { if (t.includes(w)) s += 1 }); neg.forEach(w => { if (t.includes(w)) s -= 1 });
  if (s === 0) return null; return Math.max(-1, Math.min(1, s / 5));
}
function topicsFromText(text: string): string[] {
  const t = (text || "").toLowerCase(); const topics = new Set<string>();
  if (/(ship|deliver|courier|arrival|late)/.test(t)) topics.add("shipping");
  if (/(return|refund|exchange)/.test(t)) topics.add("returns");
  if (/(size|fit|small|large)/.test(t)) topics.add("sizing");
  if (/(price|expensive|cheap|value)/.test(t)) topics.add("pricing");
  if (/(staff|service|support|rude|helpful)/.test(t)) topics.add("service");
  if (/(quality|material|broke|defect)/.test(t)) topics.add("quality");
  if (/(wait|queue|delay)/.test(t)) topics.add("wait_time");
  return Array.from(topics).slice(0, 5);
}

export async function POST(req: Request) {
  // Basic rate limit: 60/min per IP
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "local";
  const rl = rateLimit(`inbound:${ip}`, 60, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Guard: size (10MB)
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 10_000_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing INBOUND_EMAIL_SECRET" }, { status: 500 });

  // Postmark: we need raw body for HMAC
  const raw = await req.text();
  const sig = req.headers.get("x-postmark-signature") || "";
  if (!verifyPostmark(raw, sig, secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  // Parse Postmark payload (adjust if using Mailgun/SendGrid)
  let payload: any;
  try { payload = JSON.parse(raw); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const to = String(payload.ToFull?.[0]?.Email || payload.To || "");
  const from = String(payload.FromFull?.Email || payload.From || "");
  const bodyText =
    (payload.TextBody && String(payload.TextBody)) ||
    (payload.HtmlBody && stripHtml(String(payload.HtmlBody))) ||
    (payload.Text && String(payload.Text)) ||
    "";

  // Extract org_id from alias: reviews+<uuid>@yourdomain.com
  const m = to.match(/reviews\+([0-9a-f-]{36})@/i);
  const org_id = m?.[1];
  if (!org_id) return NextResponse.json({ error: "No org alias found" }, { status: 400 });

  const admin = supabaseAdmin();

  // Ensure "email" source exists
  let source_id: string;
  const { data: src } = await admin
    .from("sources")
    .select("id")
    .eq("org_id", org_id)
    .eq("kind", "email")
    .maybeSingle();

  if (src?.id) {
    source_id = src.id;
  } else {
    const { data: ins, error: insErr } = await admin
      .from("sources")
      .insert({
        org_id,
        kind: "email",
        display_name: "Email Forwarding",
        status: "connected",
        next_sync_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (insErr || !ins) return NextResponse.json({ error: insErr?.message || "Create source failed" }, { status: 500 });
    source_id = ins.id;
  }

  // Build deterministic external_id for dedupe
  const published_at = new Date().toISOString();
  const external_id = contentExternalId(from || null, bodyText || null, published_at);

  // Upsert review and RETURN id (do-update ON CONFLICT so we always get the row)
  const reviewRow = {
    org_id,
    source_id,
    external_id,
    author: from || null,
    rating: null,
    title: null,
    body: bodyText.slice(0, 8000),
    language: "en",
    published_at,
  };

  const { data: up, error: upErr } = await admin
    .from("reviews")
    .upsert(reviewRow, { onConflict: "org_id,source_id,external_id" })
    .select("id")
    .single();
  if (upErr || !up) return NextResponse.json({ error: upErr?.message || "Upsert failed" }, { status: 500 });

  // Inline analysis (no user session here)
  const sentiment = scoreFromText(reviewRow.body) ?? 0;
  const topics = topicsFromText(reviewRow.body);
  const summary = reviewRow.body.slice(0, 140);

  const { error: aErr } = await admin
    .from("review_analysis")
    .upsert({ review_id: up.id, sentiment, summary, topics, entities: {} });
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

  // Recompute daily rollups for this org (fast RPC; add the function once)
  await admin.rpc("compute_insight_daily", { p_org_id: org_id }).catch(() => { /* ignore if not created yet */ });

  return NextResponse.json({ ok: true, org_id, source_id, review_id: up.id });
}
