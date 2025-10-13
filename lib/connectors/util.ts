// /lib/connectors/util.ts
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { MappedReview } from "./types";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role
  { auth: { persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const ANALYZE_MODEL = process.env.OPENAI_ANALYZE_MODEL || "gpt-4o-mini";

/**
 * Upsert reviews by (org_id, external_id), then fetch their ids.
 * We don't rely on .onConflict().ignore().select() behavior.
 */
export async function upsertReviews(rows: MappedReview[]) {
  if (!rows.length) return [];

  // Prepare payload for reviews table
  const payload = rows.map((r) => ({
    org_id: r.org_id,
    source_id: r.source_id,
    external_id: r.external_id,
    author_name: r.author ?? null,
    rating: r.rating ?? null,
    text: r.text,
    url: r.url ?? null,
    published_at: r.published_at ?? null,
    raw: r.raw ?? null,
  }));

  // Use upsert with onConflict key matching your unique index
  // (If your Supabase version doesn't support options, you can use insert+onConflict+ignore.)
  const { error: upErr } = await supa
    .from("reviews")
    .upsert(payload, {
      onConflict: "org_id,external_id",
      ignoreDuplicates: false,
    })
    .select("id"); // this 'select' returns all impacted rows in newer PostgREST, but we won't rely on it
  if (upErr) throw upErr;

  // Build a per-org map of external_ids to query back ids reliably
  const byOrg = new Map<string, string[]>();
  for (const r of rows) {
    const arr = byOrg.get(r.org_id) || [];
    arr.push(r.external_id);
    byOrg.set(r.org_id, arr);
  }

  // Fetch the ids for all (org_id, external_id) pairs we just upserted
  const results: { id: string; org_id: string; text: string }[] = [];

  for (const [org_id, extIds] of byOrg.entries()) {
    // Chunk IN() to avoid oversized queries
    const CHUNK = 1000;
    for (let i = 0; i < extIds.length; i += CHUNK) {
      const chunk = extIds.slice(i, i + CHUNK);
      const { data, error } = await supa
        .from("reviews")
        .select("id, org_id, text")
        .eq("org_id", org_id)
        .in("external_id", chunk);
      if (error) throw error;
      results.push(...(data ?? []));
    }
  }

  return results;
}

export async function embedNewReviews(
  inserted: { id: string; org_id: string; text: string }[]
) {
  if (!inserted.length) return 0;
  const BATCH = 64;
  let wrote = 0;

  for (let i = 0; i < inserted.length; i += BATCH) {
    const chunk = inserted.slice(i, i + BATCH);
    const inputs = chunk.map((r) => r.text || "");
    const emb = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: inputs,
    });
    const rows = chunk.map((r, idx) => ({
      review_id: r.id,
      org_id: r.org_id,
      embedding: emb.data[idx].embedding,
    }));
    const { error } = await(supa.from("review_embeddings") as any)
      .insert(rows)
      .onConflict("review_id")
      .ignore();
    if (error) throw error;
    wrote += rows.length;
  }
  return wrote;
}
export async function analyzeNewReviews(
  inserted: { id: string; org_id: string; text: string }[]
) {
  if (!inserted.length) return 0;
  const BATCH = 20;
  let wrote = 0;

  for (let i = 0; i < inserted.length; i += BATCH) {
    const chunk = inserted.slice(i, i + BATCH);

    const prompt = chunk
      .map((r, idx) => `#${idx + 1}\nTEXT:\n${r.text}\n— END`)
      .join("\n\n");
    const sys = `You are an analyst that outputs strict JSON.
For each text, return JSON object with fields:
- sentiment: number in [-1,1]
- topics: 3-6 short phrases
- suggestions: 1-3 action items.
Return: {"items":[ ...same order as input... ]}`;

    const resp = await openai.chat.completions.create({
      model: ANALYZE_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: prompt },
      ],
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(resp.choices[0].message.content || "{}");
    } catch {
      continue;
    }
    const items: any[] = Array.isArray(parsed?.items) ? parsed.items : [];

    const rows = chunk.map((r, idx) => ({
      review_id: r.id,
      org_id: r.org_id,
      sentiment: Number(items[idx]?.sentiment ?? 0),
      topics: Array.isArray(items[idx]?.topics) ? items[idx].topics : [],
      suggestions: Array.isArray(items[idx]?.suggestions)
        ? items[idx].suggestions
        : [],
      model: ANALYZE_MODEL,
    }));

    // 👇 FIX: Cast to any to allow onConflict()
    const { error } = await (supa.from("review_analysis") as any)
      .insert(rows)
      .onConflict("review_id")
      .merge();

    if (error) throw error;
    wrote += rows.length;
  }

  return wrote;
}



export async function saveSourceState(
  source_id: string,
  cursor: string | null,
  since?: string | null
) {
  const { error } = await supa.from("source_state").upsert({
    source_id,
    cursor: cursor ?? null,
    since: since ? new Date(since).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadSourceState(source_id: string) {
  const { data } = await supa
    .from("source_state")
    .select("cursor, since")
    .eq("source_id", source_id)
    .maybeSingle();
  return { cursor: data?.cursor ?? null, since: data?.since ?? null };
}
