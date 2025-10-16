// /lib/connectors/util.ts
import { supabaseService } from "@/lib/supabase-server";
import type { PostgrestError } from "@supabase/supabase-js";
import OpenAI from "openai";

/** ---- Supabase client (instance) ---- */
const supa = supabaseService();

/** ---- OpenAI ---- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const ANALYZE_MODEL = process.env.OPENAI_ANALYZE_MODEL || "gpt-4o-mini";

/** ---- Retry/backoff fetch helper ---- */
const MAX_RETRIES = Number(process.env.CONNECTOR_MAX_RETRIES ?? 5);
const BASE_MS = Number(process.env.CONNECTOR_BASE_RETRY_MS ?? 500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jittered = (i: number) =>
  BASE_MS * 2 ** i + Math.floor(Math.random() * BASE_MS);

export async function fetchJson(url: string, init?: RequestInit) {
  let lastErr: any;
  for (let i = 0; i <= MAX_RETRIES; i++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || res.status >= 500) {
        if (i === MAX_RETRIES) {
          const body = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${res.statusText} :: ${body}`);
        }
        const ra = Number(res.headers.get("retry-after"));
        await sleep(Number.isFinite(ra) ? ra * 1000 : jittered(i));
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} :: ${body}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (i === MAX_RETRIES) break;
      await sleep(jittered(i));
    }
  }
  throw lastErr;
}

/** ---- Types ---- */
export type ReviewRow = {
  org_id: string;
  source: "google_gbp" | "google_places" | "yelp" | "reddit";
  external_id: string;
  author?: string | null;
  rating?: number | null;
  text?: string | null; // incoming textual content
  url?: string | null;
  created_at_ext?: string | null; // external timestamp (maps to published_at/created_at_ext)
  raw?: any;
};

/** ---- Upsert reviews (idempotent on org_id, source, external_id) ----
 * Your schema uses:
 *  - body (NOT NULL) for the text
 *  - source (text)
 */
export async function upsertReviews(rows: ReviewRow[]) {
  if (!rows.length) return { count: 0, ids: [] as string[] };

  const payload = rows.map((r) => ({
    org_id: r.org_id,
    source: r.source,
    external_id: r.external_id,
    body: (r.text ?? "").toString(), // ensure non-null for NOT NULL constraint
    author: r.author ?? null, // you have both author and author_name — store in both if you want
    author_name: r.author ?? null,
    rating: r.rating ?? null,
    url: r.url ?? null,
    published_at: r.created_at_ext ?? null,
    created_at_ext: r.created_at_ext ?? null,
    raw: r.raw ?? null,
  }));

  // Upsert and return ids of affected rows
  const { data, error } = await supa
    .from("reviews")
    .upsert(payload, {
      onConflict: "org_id,source,external_id",
      ignoreDuplicates: false,
    })
    .select("id");

  if (error) throw error as PostgrestError;

  // If PostgREST returns ids (newer versions do), use them; otherwise fall back to a fetch
  if (data && Array.isArray(data) && data.length) {
    return { count: data.length, ids: data.map((d: any) => d.id) };
  }

  // Fallback: query by org_id + external_ids to get ids reliably
  const byOrg = new Map<string, string[]>();
  for (const r of rows) {
    const arr = byOrg.get(r.org_id) || [];
    arr.push(r.external_id);
    byOrg.set(r.org_id, arr);
  }

  const results: string[] = [];
  for (const [org_id, extIds] of byOrg.entries()) {
    const CHUNK = 1000;
    for (let i = 0; i < extIds.length; i += CHUNK) {
      const chunk = extIds.slice(i, i + CHUNK);
      const { data: sel, error: selErr } = await supa
        .from("reviews")
        .select("id")
        .eq("org_id", org_id)
        .in("external_id", chunk);
      if (selErr) throw selErr;
      results.push(...(sel?.map((r: any) => r.id) ?? []));
    }
  }
  return { count: results.length, ids: results };
}

/** ---- Embeddings ---- */
export async function embedNewReviews(
  inserted: { id: string; org_id: string; body: string }[]
) {
  if (!inserted.length) return 0;
  const BATCH = 64;
  let wrote = 0;

  for (let i = 0; i < inserted.length; i += BATCH) {
    const chunk = inserted.slice(i, i + BATCH);
    const inputs = chunk.map((r) => r.body || "");
    const emb = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: inputs,
    });
    const rows = chunk.map((r, idx) => ({
      review_id: r.id,
      org_id: r.org_id,
      embedding: emb.data[idx].embedding,
    }));
    const { error } = await supa.from("review_embeddings").upsert(rows, {
      onConflict: "review_id",
      ignoreDuplicates: true, // skip if embedding already exists
    });
    if (error) throw error;
    wrote += rows.length;
  }
  return wrote;
}

/** ---- Analysis ---- */
export async function analyzeNewReviews(
  inserted: { id: string; org_id: string; body: string }[]
) {
  if (!inserted.length) return 0;
  const BATCH = 20;
  let wrote = 0;

  for (let i = 0; i < inserted.length; i += BATCH) {
    const chunk = inserted.slice(i, i + BATCH);

    const sys = `You are an analyst that outputs strict JSON.
For each text, return JSON object with fields:
- sentiment: number in [-1,1]
- topics: 3-6 short phrases
- suggestions: 1-3 action items.
Return: {"items":[ ...same order as input... ]}`;

    const prompt = chunk
      .map((r, idx) => `#${idx + 1}\nTEXT:\n${r.body}\n— END`)
      .join("\n\n");

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
      parsed = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    } catch {
      parsed = {};
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

    const { error } = await supa.from("review_analysis").upsert(rows, {
      onConflict: "review_id", // upsert will merge by default
    });

    if (error) throw error;
    wrote += rows.length;
  }

  return wrote;
}

/** ---- Source cursor/credentials (Option B schema) ---- */
export async function getCursor(orgId: string, source: string) {
  const { data, error } = await supa
    .from("source_credentials")
    .select("cursor, credentials, updated_at")
    .eq("org_id", orgId)
    .eq("source", source)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  const row = data?.[0];
  return { cursor: row?.cursor ?? {}, credentials: row?.credentials ?? {} };
}

export async function setCursor(orgId: string, source: string, cursor: any) {
  const { error } = await supa.from("source_credentials").upsert(
    {
      org_id: orgId,
      source,
      cursor,
      updated_at: new Date().toISOString(),
    },
    // your PK/unique is (org_id, source)
    { onConflict: "org_id,source" }
  );
  if (error) throw error;
}

/** ---- Kick embeddings/analysis pipeline ---- */
export async function kickEmbedding(ids: string[]) {
  if (!ids.length) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await fetch(`${site}/api/insights/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-key": process.env.INTERNAL_SYNC_KEY!,
    },
    body: JSON.stringify({ review_ids: ids }),
  }).catch(() => {});
}

