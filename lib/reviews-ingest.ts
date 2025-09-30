import { parse } from "csv-parse/sync";
import { supabaseServer, supabaseService } from "@/lib/supabase-server";
import { rateLimit, buildRateLimitHeaders } from "@/lib/rate-limits";
import { contentExternalId, normalize } from "@/lib/hash";

// --- types from incoming CSV/JSON
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

export async function getCallerOrgId() {
  const supabase = supabaseServer();
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

export async function getOrCreateCsvSource(org_id: string) {
  const supa = supabaseServer();
  const { data: found } = await supa
    .from("sources")
    .select("id")
    .eq("org_id", org_id)
    .eq("kind", "csv")
    .maybeSingle();

  if (found?.id) return found.id as string;

  const { data: created, error } = await supa
    .from("sources")
    .insert({ org_id, kind: "csv", display_name: "CSV Upload", config: {} })
    .select("id")
    .single();

  if (error || !created?.id) throw new Error("Failed to create CSV source");
  return created.id as string;
}

export function mapRowsToReviews(
  org_id: string,
  source_id: string,
  rows: IncomingRow[]
) {
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
        source_id,
        external_id,
        author,
        rating: r.rating != null ? toNumber(r.rating) : null,
        title: r.title ?? null,
        body,
        language: "en",
        published_at,
      };
    })
    .filter((r) => r.body && r.body.trim().length > 0);
}

export async function upsertReviews(
  reviewRows: ReturnType<typeof mapRowsToReviews>
) {
  const supa = supabaseServer(); // anon client, relies on your RLS (recommended)
  const { error } = await supa.from("reviews").upsert(reviewRows, {
    onConflict: "org_id,source_id,external_id",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
}

export function parseCsvText(csvText: string): {
  rows: IncomingRow[];
  errors: any[];
} {
  const parsed = Papa.parse<IncomingRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });
  return { rows: parsed.data || [], errors: parsed.errors || [] };
}

export function guardSizeAndType(
  req: Request,
  maxBytes: number,
  mustBe?: string[]
) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > maxBytes)
    return {
      ok: false,
      res: new Response(JSON.stringify({ error: "File too large" }), {
        status: 413,
      }),
    };
  if (mustBe?.length) {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    const okType = mustBe.some((t) => ct.includes(t));
    if (!okType)
      return {
        ok: false,
        res: new Response(
          JSON.stringify({ error: "Unsupported content-type" }),
          { status: 415 }
        ),
      };
  }
  return { ok: true as const };
}

export async function triggerAnalyzeBackfill() {
  const base = process.env.NEXT_PUBLIC_BASE_URL!;
  const key = process.env.INTERNAL_SYNC_KEY!;
  try {
    await fetch(`${base}/api/analyze`, {
      method: "POST",
      headers: { "x-internal-key": key },
    });
  } catch {
    // non-blocking
  }
}

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
