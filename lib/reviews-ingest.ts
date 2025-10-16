// lib/reviews-ingest.ts
import { parse } from "csv-parse/sync";
import { supabaseServer, supabaseService } from "@/lib/supabase-server";
import { rateLimit, buildRateLimitHeaders } from "@/lib/rate-limits";
import { contentExternalId, normalize } from "@/lib/hash";

/** ---- Types from incoming CSV/JSON ---- */
export type IncomingRow = {
  rating?: string | number;
  title?: string;
  body?: string;
  review?: string;
  published_at?: string;
  author?: string;
  external_id?: string | number;
};

function toNumber(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}
function toISO(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/** Session path (only for UI endpoints that need the current user/org) */
export async function getCallerOrgId() {
  const supabase = await supabaseServer(); // cookie-aware anon client
  // @ts-ignore - supabase.auth may be undefined depending on setup
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error("Unauthorized");

  const { data: member, error: memErr } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr || !member?.org_id) throw new Error("No org membership");
  return member.org_id as string;
}

/**
 * Legacy no-op: we no longer persist a row in `sources` for manual ingest.
 * Keep signature so callers don't break; always return "csv".
 */
export async function getOrCreateCsvSource(_org_id: string) {
  return "csv";
}

export type ReviewInsert = {
  org_id: string;
  source: "csv" | "yelp" | "reddit" | "google_gbp" | "google_places";
  external_id: string;
  author: string | null;
  body: string;
  rating: number | null;
  published_at: string | null;
};

/** Map incoming rows to `reviews` rows (final schema uses `body` + `source`) */
export function mapRowsToReviews(
  org_id: string,
  _source_id: string, // kept for compatibility (unused)
  rows: IncomingRow[]
): ReviewInsert[] {
  // <-- explicit return type
  return rows
    .map((r) => {
      const author = r.author ?? null;
      const body = (r.body ?? r.review ?? "").toString();
      const published_at = toISO(r.published_at);

      const external_id =
        (r.external_id ? normalize(String(r.external_id)) : null) ||
        contentExternalId(author, body, published_at);

      return {
        org_id,
        source: "csv" as const, // <-- literal, NOT string
        external_id: external_id!, // <-- assert non-null after fallback
        author,
        body,
        rating: r.rating != null ? toNumber(r.rating) : null,
        published_at,
      };
    })
    .filter((r) => r.body.trim().length > 0);
}

/**
 * Upsert reviews and return the concrete IDs that exist in `reviews`.
 * Requires the unique index: (org_id, source, external_id).
 */
// 3) Let upsertReviews accept rows from any connector
export async function upsertReviews(
  reviewRows: ReviewInsert[]
): Promise<string[]> {
  const supa = supabaseService();

  const { error: upErr } = await supa.from("reviews").upsert(reviewRows, {
    onConflict: "org_id,source,external_id",
    ignoreDuplicates: false,
  });
  if (upErr) throw new Error(upErr.message);

  // fetch back ids
  const byOrgSource = new Map<string, string[]>();
  for (const r of reviewRows) {
    const key = `${r.org_id}|${r.source}`;
    const arr = byOrgSource.get(key) || [];
    arr.push(r.external_id);
    byOrgSource.set(key, arr);
  }

  const ids: string[] = [];
  for (const [key, extIds] of byOrgSource) {
    const [org_id, source] = key.split("|");
    const CHUNK = 1000;
    for (let i = 0; i < extIds.length; i += CHUNK) {
      const chunk = extIds.slice(i, i + CHUNK);
      const { data, error } = await supa
        .from("reviews")
        .select("id")
        .eq("org_id", org_id)
        .eq("source", source)
        .in("external_id", chunk);
      if (error) throw new Error(error.message);
      ids.push(...(data?.map((d: any) => d.id) ?? []));
    }
  }

  return ids;
}

/** CSV text → rows */
export function parseCsvText(csvText: string): {
  rows: IncomingRow[];
  errors: any[];
} {
  try {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as IncomingRow[];
    return { rows: records || [], errors: [] };
  } catch (e: any) {
    return { rows: [], errors: [e?.message || "parse error"] };
  }
}

/** Fire-and-forget analyzer trigger (kept for compatibility; optional) */
export async function triggerAnalyzeBackfill() {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";
  const key = process.env.INTERNAL_SYNC_KEY || "";
  try {
    await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: key ? { "x-internal-key": key } : {},
    });
  } catch {
    // non-blocking
  }
}

/** Tiny rate limit helper for edge endpoints */
export function applyRateLimitOr429(
  key: string,
  limit = 30,
  windowMs = 60_000
) {
  const rl = rateLimit(key, limit, windowMs);
  if (!rl.allowed) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: buildRateLimitHeaders(limit, rl),
    });
  }
  return null;
}
