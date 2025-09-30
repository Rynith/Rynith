// app/api/analyze/route.ts
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";
import { embedText } from "@/lib/ai"; // must return Promise<number[]>

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  // Internal key (optional but recommended)
  const provided = (req.headers.get("x-internal-key") ?? "").trim();
  if (
    process.env.INTERNAL_SYNC_KEY &&
    provided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }

  const admin = supabaseService();

  // Optional ?org=<uuid> to limit to a single org
  const url = new URL(req.url);
  const orgFilter = (url.searchParams.get("org") || "").trim();

  // 1) Pull a batch of unanalyzed reviews (body required)
  let q = admin
    .from("reviews")
    .select("id, org_id, body, analyzed_at, created_at")
    .is("analyzed_at", null)
    .not("body", "is", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (orgFilter) q = q.eq("org_id", orgFilter);

  const { data: reviews, error: rErr } = await q;
  if (rErr) return j(500, { error: rErr.message });
  if (!reviews?.length) return j(200, { ok: true, processed: 0 });

  // 2) Preload which have embeddings to avoid duplicate work
  const ids = reviews.map((r) => r.id);
  let alreadyEmbedded = new Set<string>();
  if (ids.length) {
    const { data: embRows } = await admin
      .from("review_embeddings")
      .select("review_id")
      .in("review_id", ids);
    alreadyEmbedded = new Set((embRows ?? []).map((e: any) => e.review_id));
  }

  let processed = 0;
  const touchedOrgIds = new Set<string>();

  for (const r of reviews) {
    if (!r?.id || !r?.org_id || !r?.body) continue;

    const text = String(r.body).trim();
    if (!text) continue;

    // 3) Run your analyzer (stub—replace with your LLM/NLP)
    const summary = text.slice(0, 140);
    const sentiment = 0; // TODO: real model score (-1..1)
    const topics: string[] = []; // TODO: real topic list
    const entities: Record<string, number> = {}; // TODO: real entities

    const { error: aErr } = await admin
      .from("review_analysis")
      .upsert(
        { review_id: r.id, sentiment, summary, topics, entities },
        { onConflict: "review_id" }
      );
    if (aErr) continue; // skip this row but keep going

    // 4) Inline embedding (skip if exists). Safe even if OPENAI_API_KEY is missing.
    if (!alreadyEmbedded.has(r.id) && process.env.OPENAI_API_KEY) {
      try {
        const vector = await embedText(text.slice(0, 2000));
        await admin.from("review_embeddings").upsert(
          {
            review_id: r.id,
            org_id: r.org_id,
            embedding: vector,
            model: process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
          },
          { onConflict: "review_id" }
        );
      } catch {
        // Swallow embedding errors; analysis already saved
      }
    }

    // 5) Mark as analyzed (no .then/.catch — just await)
    await admin
      .from("reviews")
      .update({ analyzed_at: new Date().toISOString() })
      .eq("id", r.id);

    touchedOrgIds.add(r.org_id as string);
    processed += 1;
  }

  // 6) (Optional) kick daily recompute per org (ignore failures)
  await Promise.all(
    Array.from(touchedOrgIds).map(async (org_id) => {
      const { error } = await admin.rpc("compute_insight_daily", {
        p_org_id: org_id,
      });
      // deliberately ignore errors; recompute is best-effort
      return null;
    })
  );

  return j(200, { ok: true, processed, orgs: Array.from(touchedOrgIds) });
}
