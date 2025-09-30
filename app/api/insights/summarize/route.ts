// app/api/insights/summarize/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { summarizeClusters } from "@/lib/ai";

function j(s: number, p: any) {
  return new NextResponse(JSON.stringify(p), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const provided = (req.headers.get("x-internal-key") || "").trim();
  if (
    !process.env.INTERNAL_SYNC_KEY ||
    provided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }

  const days = 7;
  const period_start = new Date(Date.now() - days * 86400_000)
    .toISOString()
    .slice(0, 10);
  const period_end = new Date().toISOString().slice(0, 10);

  const sb = supabaseService();

  // Which orgs have clusters this window?
  const { data: orgsRows, error: oErr } = await sb
    .from("topic_clusters")
    .select("org_id")
    .eq("period_start", period_start)
    .eq("period_end", period_end);

  if (oErr) return j(500, { error: oErr.message });

  const orgIds = Array.from(
    new Set((orgsRows || []).map((r: any) => r.org_id))
  ).filter(Boolean);
  let wrote = 0;

  for (const org_id of orgIds) {
    const [{ data: clusters }, { data: orgRow }, { data: daily }] =
      await Promise.all([
        sb
          .from("topic_clusters")
          .select("label, terms, size, avg_sentiment")
          .eq("org_id", org_id)
          .eq("period_start", period_start)
          .eq("period_end", period_end)
          .order("size", { ascending: false }),
        sb.from("organizations").select("name").eq("id", org_id).maybeSingle(),
        sb
          .from("insight_daily")
          .select("review_count, avg_rating, avg_sentiment")
          .eq("org_id", org_id)
          .gte("day", period_start)
          .lte("day", period_end),
      ]);

    const totals = (daily || []).reduce(
      (acc: any, r: any) => {
        const c = Number(r.review_count || 0);
        if (Number.isFinite(c)) acc.reviews += c;
        if (r.avg_rating != null) acc.ratingNum += Number(r.avg_rating) * c;
        if (r.avg_sentiment != null) acc.sentNum += Number(r.avg_sentiment) * c;
        acc.den += c;
        return acc;
      },
      { reviews: 0, ratingNum: 0, sentNum: 0, den: 0 }
    );

    const avgRating =
      totals.den > 0 ? +(totals.ratingNum / totals.den).toFixed(2) : null;
    const avgSentiment =
      totals.den > 0 ? +(totals.sentNum / totals.den).toFixed(2) : null;

    const ai = await summarizeClusters({
      orgName: orgRow?.name ?? null,
      days,
      totals: { reviews: totals.reviews, avgRating, avgSentiment },
      clusters: (clusters || []).map((c: any) => ({
        label: c.label,
        terms: c.terms || [],
        size: c.size || 0,
        avg_sentiment: c.avg_sentiment,
      })),
    });

    // Upsert org_summaries (weekly)
    const { error: upErr } = await sb.from("org_summaries").upsert({
      org_id,
      period_start,
      period_end,
      period_kind: "weekly",
      summary: ai.summary,
      actions: ai.actions,
      positives: ai.positives,
      negatives: ai.negatives,
      model: ai.model,
      created_at: new Date().toISOString(),
    });
    if (upErr) return j(500, { error: upErr.message });

    wrote += 1;
  }

  return j(200, {
    ok: true,
    orgs: orgIds.length,
    wrote,
    period_start,
    period_end,
  });
}
