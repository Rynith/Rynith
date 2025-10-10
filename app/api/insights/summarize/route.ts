// app/api/insights/summarize/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { summarizeClusters } from "@/lib/ai";

const j = (s: number, p: any) =>
  new NextResponse(JSON.stringify(p), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/**
 * POST /api/insights/summarize[?org_id=...&days=7]
 * Requires header: x-internal-key
 *
 * Summarizes topic_clusters (for the last N days window) into org_summaries.
 */
export async function POST(req: Request) {
  // --- Auth gate -------------------------------------------------------------
  const provided = (req.headers.get("x-internal-key") || "").trim();
  if (
    !process.env.INTERNAL_SYNC_KEY ||
    provided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }

  const url = new URL(req.url);
  const days = Math.max(
    1,
    Math.min(30, Number(url.searchParams.get("days") || 7))
  );
  const onlyOrg = (url.searchParams.get("org_id") || "").trim() || null;

  const period_start = new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const period_end = new Date().toISOString().slice(0, 10);

  try {
    const sb = supabaseService();

    // --- Which orgs have clusters for the window? ---------------------------
    const orgQuery = sb
      .from("topic_clusters")
      .select("org_id")
      .eq("period_start", period_start)
      .eq("period_end", period_end);

    const { data: orgRows, error: orgErr } = onlyOrg
      ? await orgQuery.eq("org_id", onlyOrg)
      : await orgQuery;

    if (orgErr) {
      console.error("[summarize] select orgs error:", orgErr);
      return j(500, { error: orgErr.message });
    }

    const orgIds = Array.from(
      new Set((orgRows || []).map((r: any) => r.org_id))
    ).filter(Boolean);
    if (orgIds.length === 0) {
      return j(200, {
        ok: true,
        orgs: 0,
        wrote: 0,
        note: "No clusters found for window; nothing to summarize.",
        period_start,
        period_end,
      });
    }

    let wrote = 0;

    // --- Process each org ---------------------------------------------------
    for (const org_id of orgIds) {
      try {
        // Fetch clusters for the window
        const { data: clusters, error: cErr } = await sb
          .from("topic_clusters")
          .select("label, terms, size, avg_sentiment")
          .eq("org_id", org_id)
          .eq("period_start", period_start)
          .eq("period_end", period_end)
          .order("size", { ascending: false });

        if (cErr) throw cErr;

        // Org name (optional)
        const { data: orgRow, error: oErr } = await sb
          .from("organizations")
          .select("name")
          .eq("id", org_id)
          .maybeSingle();
        if (oErr) throw oErr;

        // Aggregate insight_daily for KPIs
        const { data: daily, error: dErr } = await sb
          .from("insight_daily")
          .select("review_count, avg_rating, avg_sentiment")
          .eq("org_id", org_id)
          .gte("day", period_start)
          .lte("day", period_end);

        if (dErr) throw dErr;

        const totals = (daily || []).reduce(
          (acc: any, r: any) => {
            const c = Number(r.review_count || 0);
            if (Number.isFinite(c)) acc.reviews += c;
            if (r.avg_rating != null) acc.ratingNum += Number(r.avg_rating) * c;
            if (r.avg_sentiment != null)
              acc.sentNum += Number(r.avg_sentiment) * c;
            acc.den += c;
            return acc;
          },
          { reviews: 0, ratingNum: 0, sentNum: 0, den: 0 }
        );

        const avgRating =
          totals.den > 0 ? +(totals.ratingNum / totals.den).toFixed(2) : null;
        const avgSentiment =
          totals.den > 0 ? +(totals.sentNum / totals.den).toFixed(2) : null;

        // Guard: if there are truly no clusters, skip summarization
        const clusterInput = (clusters || []).map((c: any) => ({
          label: c.label ?? null,
          terms: Array.isArray(c.terms) ? c.terms : [],
          size: Number(c.size || 0),
          avg_sentiment: c.avg_sentiment ?? null,
        }));

        if (clusterInput.length === 0) {
          // Still write an empty summary to mark the window as processed (optional)
          await sb.from("org_summaries").upsert({
            org_id,
            period_start,
            period_end,
            period_kind: "weekly",
            summary: "No material clusters found this period.",
            actions: [],
            positives: [],
            negatives: [],
            model: null,
            created_at: new Date().toISOString(),
          });
          wrote += 1;
          continue;
        }

        // --- AI summarization ------------------------------------------------
        const ai = await summarizeClusters({
          orgName: orgRow?.name ?? null,
          days,
          totals: { reviews: totals.reviews, avgRating, avgSentiment },
          clusters: clusterInput,
        });

        // --- Upsert org_summaries -------------------------------------------
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

        if (upErr) throw upErr;

        wrote += 1;
      } catch (orgError: any) {
        // Log but continue with next org
        console.error(`[summarize] org ${org_id} failed:`, orgError);
      }
    }

    return j(200, {
      ok: true,
      orgs: orgIds.length,
      wrote,
      period_start,
      period_end,
    });
  } catch (e: any) {
    console.error("[summarize] unhandled:", e);
    return j(500, { error: String(e?.message || e) });
  }
}

// Optional: mirror GET to POST for quick probes
export async function GET(req: Request) {
  return POST(req);
}
