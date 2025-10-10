// app/api/insights/cluster/route.ts
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

const j = (s: number, p: any) =>
  new NextResponse(JSON.stringify(p), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

// vector helpers
const dot = (a: number[], b: number[]) =>
  a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
const norm = (x: number[]) => Math.sqrt(x.reduce((s, v) => s + v * v, 0));
const normalize = (x: number[]) => {
  const n = norm(x) || 1;
  return x.map((v) => v / n);
};

type EmbRow = {
  id: string;
  org_id: string;
  embedding: number[];
  sentiment: number | null;
  topics: string[] | null;
};

export async function POST(req: Request) {
  const provided = (req.headers.get("x-internal-key") || "").trim();
  if (
    !process.env.INTERNAL_SYNC_KEY ||
    provided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }

  try {
    const url = new URL(req.url);
    const onlyOrg = (url.searchParams.get("org_id") || "").trim() || null;
    const days = Math.max(
      1,
      Math.min(30, Number(url.searchParams.get("days") || 7))
    );
    const sinceISO = new Date(Date.now() - days * 86_400_000).toISOString();

    const sb = supabaseService();

    // IMPORTANT: embed review_analysis via `reviews`, not at the top-level
    const q = sb
      .from("review_embeddings")
      .select(
        `
        review_id:id,
        org_id,
        embedding,
        reviews!inner (
          id,
          org_id,
          published_at,
          review_analysis (
            sentiment,
            topics
          )
        )
      `
      )
      .gte("reviews.published_at", sinceISO)
      // when ordering by a joined table, point to it explicitly
      .order("published_at", { referencedTable: "reviews", ascending: false })
      .limit(2000);

    const { data: rowsRaw, error } = onlyOrg
      ? await q.eq("org_id", onlyOrg)
      : await q;
    if (error) {
      console.error("[cluster] select error:", error);
      return j(500, { error: error.message });
    }

    // Reshape safely from the nested structure
    const rows: EmbRow[] = (rowsRaw || [])
      .map((r: any) => {
        const ra = Array.isArray(r?.reviews?.review_analysis)
          ? r.reviews.review_analysis[0]
          : r?.reviews?.review_analysis ?? null;

        return {
          id: r.review_id,
          org_id: r.org_id,
          embedding: Array.isArray(r.embedding)
            ? (r.embedding as number[])
            : [],
          sentiment: ra?.sentiment ?? null,
          topics: ra?.topics ?? null,
        };
      })
      .filter((r) => r.embedding.length > 0 && r.org_id);

    // Group by org
    const byOrg = new Map<string, EmbRow[]>();
    for (const r of rows) {
      if (!byOrg.has(r.org_id)) byOrg.set(r.org_id, []);
      byOrg.get(r.org_id)!.push(r);
    }

    const period_start = new Date(Date.now() - days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const period_end = new Date().toISOString().slice(0, 10);
    let totalClusters = 0;

    for (const [org_id, arr] of byOrg.entries()) {
      if (!arr.length) continue;

      const points = arr.map((r) => normalize(r.embedding));
      const THRESH = 0.88;
      const clusters: { ids: number[]; centroid: number[] }[] = [];

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        let best = -1;
        let bestSim = -1;
        for (let c = 0; c < clusters.length; c++) {
          const sim = dot(p, clusters[c].centroid);
          if (sim > bestSim) {
            bestSim = sim;
            best = c;
          }
        }
        if (bestSim >= THRESH && best >= 0) {
          clusters[best].ids.push(i);
          const all = clusters[best].ids.map((idx) => points[idx]);
          const m = new Array(all[0].length).fill(0);
          for (const v of all) for (let k = 0; k < m.length; k++) m[k] += v[k];
          for (let k = 0; k < m.length; k++) m[k] /= all.length;
          clusters[best].centroid = normalize(m);
        } else {
          clusters.push({ ids: [i], centroid: p });
        }
      }

      const stats = clusters
        .map((c, ci) => {
          const memberIdx = c.ids;
          const size = memberIdx.length;

          const avgSent =
            size > 0
              ? memberIdx.reduce(
                  (s, idx) => s + (Number(arr[idx].sentiment ?? 0) || 0),
                  0
                ) / size
              : null;

          const bag: Record<string, number> = {};
          for (const idx of memberIdx) {
            for (const t of arr[idx].topics || []) {
              const k = String(t).toLowerCase().trim();
              if (k) bag[k] = (bag[k] || 0) + 1;
            }
          }
          const terms = Object.entries(bag)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([t]) => t);

          const label = terms[0] || null;
          const exampleIds = memberIdx.slice(0, 5).map((idx) => arr[idx].id);

          return {
            org_id,
            period_start,
            period_end,
            cluster_id: ci + 1,
            size,
            centroid: c.centroid, // float8[]
            label,
            terms,
            avg_sentiment: avgSent,
            example_review_ids: exampleIds,
          };
        })
        .filter((s) => s.size >= 2)
        .sort((a, b) => b.size - a.size)
        .slice(0, 8);

      const svc = supabaseService();

      const del = await svc
        .from("topic_clusters")
        .delete()
        .eq("org_id", org_id)
        .eq("period_start", period_start)
        .eq("period_end", period_end);
      if (del.error) {
        console.error("[cluster] delete error:", del.error);
        return j(500, { error: del.error.message });
      }

      if (stats.length) {
        const ins = await svc.from("topic_clusters").insert(stats as any[]);
        if (ins.error) {
          console.error("[cluster] insert error:", ins.error);
          return j(500, { error: ins.error.message });
        }
      }

      totalClusters += stats.length;
    }

    return j(200, {
      ok: true,
      orgs: byOrg.size,
      clusters: totalClusters,
      period_start,
      period_end,
    });
  } catch (e: any) {
    console.error("[cluster] unhandled:", e);
    return j(500, { error: String(e?.message || e) });
  }
}
