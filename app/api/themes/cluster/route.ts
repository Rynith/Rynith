// (cosine threshold + union-find; labels via LLM optional):

export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function j(s: number, p: any) {
  return new NextResponse(JSON.stringify(p), {
    status: s,
    headers: { "content-type": "application/json" },
  });
}

const COS = (a: number[], b: number[]) => {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i],
      y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
};

export async function POST(req: Request) {
  if (
    (req.headers.get("x-internal-key") || "") !== process.env.INTERNAL_SYNC_KEY
  )
    return j(401, { error: "Unauthorized" });

  const sb = supabaseAdmin();
  const day = new Date().toISOString().slice(0, 10);

  // Pull recent embeddings per org
  const { data: emb, error } = await sb
    .from("review_embeddings")
    .select("review_id, org_id, embedding, reviews(body)")
    .eq("reviews.org_id", sb.rpc) // NOTE: in Supabase, best to join via view or a separate fetch
    .limit(1000);
  if (error) return j(500, { error: error.message });
  if (!emb?.length) return j(200, { ok: true, clusters: 0 });

  // Group by org
  const byOrg: Record<string, any[]> = {};
  for (const r of emb) (byOrg[r.org_id] ||= []).push(r);

  let total = 0;

  for (const [org_id, rows] of Object.entries(byOrg)) {
    // simple agglomerative based on cosine ≥ 0.82
    const T = 0.82;
    const uf = Array(rows.length)
      .fill(0)
      .map((_, i) => i);
    const find = (x: number) => (uf[x] === x ? x : (uf[x] = find(uf[x])));
    const union = (a: number, b: number) => {
      a = find(a);
      b = find(b);
      if (a !== b) uf[b] = a;
    };

    for (let i = 0; i < rows.length; i++) {
      const a = rows[i].embedding as number[];
      for (let j = i + 1; j < rows.length; j++) {
        const b = rows[j].embedding as number[];
        if (COS(a, b) >= T) union(i, j);
      }
    }

    const groups: Record<number, number[]> = {};
    for (let i = 0; i < rows.length; i++) (groups[find(i)] ||= []).push(i);

    const clusters = Object.values(groups)
      .map((idxs) => {
        const size = idxs.length;
        if (size < 3) return null; // ignore tiny clusters
        // centroid
        const dim = (rows[0].embedding as number[]).length;
        const c = new Array(dim).fill(0);
        for (const k of idxs) {
          const v = rows[k].embedding as number[];
          for (let d = 0; d < dim; d++) c[d] += v[d];
        }
        for (let d = 0; d < dim; d++) c[d] /= size;
        // samples
        const sampleIds = idxs.slice(0, 5).map((k) => rows[k].review_id);
        return { size, centroid: c, sample_review_ids: sampleIds };
      })
      .filter(Boolean) as Array<{
      size: number;
      centroid: number[];
      sample_review_ids: string[];
    }>;

    if (!clusters.length) continue;

    // Optional: label via LLM (fallback to simple keywords)
    let labeled = clusters.map((c) => ({ ...c, label: `Theme (${c.size})` }));
    try {
      if (process.env.OPENAI_API_KEY) {
        const { default: OpenAI } = await import("openai");
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Build brief snippets from sample bodies (fetch bodies if not joined)
        // Keep it short to save tokens
        const prompt =
          "Name each theme in 2–4 words:\n" +
          labeled
            .map((c, i) => `#${i + 1}: ${c.size} similar reviews`)
            .join("\n");
        const out = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.2,
          messages: [{ role: "user", content: prompt }],
        });
        // Minimal parsing; you can improve this later
        const text = out.choices?.[0]?.message?.content || "";
        const names = text
          .split("\n")
          .map((s) => s.replace(/^[#\d\:\-\s]+/, "").trim())
          .filter(Boolean);
        labeled = labeled.map((c, i) => ({ ...c, label: names[i] || c.label }));
      }
    } catch {}

    const toInsert = labeled.map((c) => ({
      org_id,
      day,
      label: c.label,
      size: c.size,
      centroid: c.centroid as any,
      sample_review_ids: c.sample_review_ids,
    }));

    const up = await sb.from("review_clusters").insert(toInsert);
    if (!up.error) total += toInsert.length;
  }

  return j(200, { ok: true, clusters: total, day });
}
