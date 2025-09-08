// app/api/alerts/run/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function todayUTC(): { dayStr: string; start: string; end: string } {
  const now = new Date();
  const dayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const start = `${dayStr}T00:00:00.000Z`;
  const end = `${dayStr}T23:59:59.999Z`;
  return { dayStr, start, end };
}
function sevenDaysBackUTC(): { start: string } {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return { start: d.toISOString() };
}

export async function POST(req: Request) {
  // ---- Auth via internal key ----
  const provided = (req.headers.get("x-internal-key") ?? "").trim();
  const expected = process.env.INTERNAL_SYNC_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: INTERNAL_SYNC_KEY is not set" },
      { status: 500 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { dayStr, start: todayStart, end: todayEnd } = todayUTC();
  const { start: last7Start } = sevenDaysBackUTC();

  // ---- 1) Pull today’s daily rows for all orgs ----
  const { data: todays, error: dErr } = await sb
    .from("insight_daily")
    .select("org_id, review_count, avg_sentiment")
    .eq("day", dayStr);

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  let created = 0;
  const toInsert: Array<{
    org_id: string;
    day: string;
    kind: string;
    message: string;
    severity: string;
    metadata: any;
  }> = [];

  // ---- 2) Rule A: avg sentiment today < 0 AND reviews >= 5 ----
  for (const row of todays ?? []) {
    const count = row.review_count ?? 0;
    const avg = row.avg_sentiment ?? 0;
    if (count >= 5 && (avg as number) < 0) {
      toInsert.push({
        org_id: row.org_id,
        day: dayStr,
        kind: "low_sentiment",
        message: `Average sentiment is negative today (${avg.toFixed(2)}) across ${count} reviews.`,
        severity: "warning",
        metadata: { avg_sentiment: avg, review_count: count },
      });
    }
  }

  // ---- 3) Rule B: "shipping" spike vs 7-day average ----
  // For each org with data today, compute shipping mentions today vs. last 7 days.
  for (const row of todays ?? []) {
    const orgId = row.org_id as string;

    // 3.1 Today’s reviews (ids)
    const { data: revToday, error: rtErr } = await sb
      .from("reviews")
      .select("id")
      .eq("org_id", orgId)
      .gte("published_at", todayStart)
      .lte("published_at", todayEnd)
      .limit(5000);

    if (rtErr) continue;
    const todayIds = (revToday ?? []).map((r: any) => r.id);
    let shippingToday = 0;
    if (todayIds.length) {
      const { data: shipToday } = await sb
        .from("review_analysis")
        .select("review_id", { count: "exact", head: true }) // count only
        .in("review_id", todayIds)
        .contains("topics", ["shipping"] as any);
      shippingToday = shipToday ? (shipToday as any).length ?? 0 : 0; // head:true returns no rows; we rely on count
    }

    // 3.2 Last 7 days (exclude today)
    const { data: rev7, error: r7Err } = await sb
      .from("reviews")
      .select("id, published_at")
      .eq("org_id", orgId)
      .gte("published_at", last7Start)
      .lt("published_at", todayStart)
      .limit(20000);
    if (r7Err) continue;

    const ids7 = (rev7 ?? []).map((r: any) => r.id);
    let shipping7 = 0;
    if (ids7.length) {
      const { count } = await sb
        .from("review_analysis")
        .select("review_id", { count: "exact", head: true })
        .in("review_id", ids7)
        .contains("topics", ["shipping"] as any);
      shipping7 = count ?? 0;
    }

    // average per day across 7 days (avoid divide-by-zero)
    const avg7 = shipping7 / 7;
    const spike = shippingToday >= Math.max(3, avg7 * 2); // threshold

    if (spike) {
      toInsert.push({
        org_id: orgId,
        day: dayStr,
        kind: "shipping_spike",
        message: `Shipping mentions spiked today: ${shippingToday} vs ${avg7.toFixed(2)}/day (7-day avg).`,
        severity: "warning",
        metadata: { shipping_today: shippingToday, shipping_7d_total: shipping7, avg_7d_per_day: avg7 },
      });
    }
  }

  // ---- 4) Upsert alerts (idempotent via unique index) ----
  if (toInsert.length) {
    const { error: insErr } = await sb
      .from("alerts")
      .upsert(toInsert, { onConflict: "org_id,day,kind", ignoreDuplicates: true });

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
    created = toInsert.length;
  }

  // (Optional) Send emails here if you have a provider wired:
  // for (const a of toInsert) await sendAlertEmail(a).catch(() => {})

  return NextResponse.json({ ok: true, created, day: dayStr });
}