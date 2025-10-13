export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { connectors } from "@/lib/connectors";
import {
  loadSourceState,
  saveSourceState,
  upsertReviews,
  embedNewReviews,
  analyzeNewReviews,
} from "@/lib/connectors/util";

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const j = (s: number, p: any) =>
  new NextResponse(JSON.stringify(p), {
    status: s,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function POST(req: Request) {
  // internal key guard
  const provided = (req.headers.get("x-internal-key") || "").trim();
  if (
    !process.env.INTERNAL_SYNC_KEY ||
    provided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }

  // Fetch connected sources
  const { data: sources, error } = await svc
    .from("sources")
    .select("id, org_id, kind, status, config, display_name")
    .eq("status", "connected");
  if (error) return j(500, { error: error.message });

  let totalFetched = 0,
    totalInserted = 0,
    totalEmbedded = 0,
    totalAnalyzed = 0;
  const perSource: any[] = [];

  for (const s of sources ?? []) {
    const c = connectors[s.kind as keyof typeof connectors];
    if (!c) {
      perSource.push({
        source_id: s.id,
        kind: s.kind,
        skipped: "no connector",
      });
      continue;
    }

    const { cursor, since } = await loadSourceState(s.id);

    // Load credentials if present
    const { data: credRow } = await svc
      .from("source_credentials")
      .select("data")
      .eq("source_id", s.id)
      .maybeSingle();

    // 1) FETCH
    let fetched = 0,
      inserted = 0,
      embedded = 0,
      analyzed = 0,
      nextCursor: string | null = null;
    try {
      const res = await c.sync({
        org_id: s.org_id,
        source_id: s.id,
        cursor,
        since,
        config: s.config || null,
        credentials: credRow?.data || null,
      });

      fetched = res.reviews.length;
      totalFetched += fetched;

      // 2) STORE (upsert/dedupe)
      const ins = await upsertReviews(res.reviews);
      inserted = ins.length;
      totalInserted += inserted;

      // 3) EMBED + 4) ANALYZE only for newly inserted
      if (inserted > 0) {
        embedded = await embedNewReviews(ins);
        totalEmbedded += embedded;

        analyzed = await analyzeNewReviews(ins);
        totalAnalyzed += analyzed;
      }

      nextCursor = res.nextCursor ?? null;
      await saveSourceState(s.id, nextCursor, since || null);

      perSource.push({
        source_id: s.id,
        kind: s.kind,
        display_name: s.display_name || null,
        fetched,
        inserted,
        embedded,
        analyzed,
        nextCursor,
      });
    } catch (e: any) {
      perSource.push({
        source_id: s.id,
        kind: s.kind,
        error: String(e?.message || e),
      });
    }
  }

  return j(200, {
    ok: true,
    sources: (sources ?? []).length,
    totalFetched,
    totalInserted,
    totalEmbedded,
    totalAnalyzed,
    perSource,
  });
}

// Optional GET guard (so a stray GET returns 405 instead of empty)
export function GET() {
  return new NextResponse(null, { status: 405 });
}
