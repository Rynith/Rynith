// app/api/ingest/route.ts
import { NextResponse } from "next/server";
import {
  mapRowsToReviews,
  upsertReviews,
  type IncomingRow,
} from "@/lib/reviews-ingest";
import { supabaseService } from "@/lib/supabase-server";
import { embedNewReviews, analyzeNewReviews } from "@/lib/connectors/util";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // ---- Parse JSON ----
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // Accept { orgId, rows } or raw array
  const url = new URL(req.url);
  const orgId: string | undefined =
    body?.orgId ||
    url.searchParams.get("orgId") ||
    req.headers.get("x-org-id") ||
    undefined;

  if (!orgId) {
    return NextResponse.json(
      { ok: false, error: "orgId required" },
      { status: 400 }
    );
  }

  const rows: IncomingRow[] = Array.isArray(body) ? body : body?.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Provide an array of rows" },
      { status: 400 }
    );
  }

  // ---- Map directly to reviews with source='csv' (no sources table) ----
  const reviewRows = mapRowsToReviews(orgId, "csv", rows);
  if (!reviewRows.length) {
    return NextResponse.json(
      { ok: false, error: "No valid rows" },
      { status: 400 }
    );
  }

  // ---- Upsert + get IDs back ----
  let ids: string[] = [];
  try {
    ids = await upsertReviews(reviewRows); // returns real review IDs
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Insert failed" },
      { status: 500 }
    );
  }

  // ---- Embed + analyze now (best-effort) ----
  if (ids.length) {
    const supa = supabaseService();
    const { data: toProcess, error } = await supa
      .from("reviews")
      .select("id, org_id, body")
      .in("id", ids);
    if (!error && toProcess?.length) {
      try {
        const embedded = await embedNewReviews(toProcess);
        const analyzed = await analyzeNewReviews(toProcess);
        return NextResponse.json({
          ok: true,
          inserted: ids.length,
          embedded,
          analyzed,
        });
      } catch (e: any) {
        // Non-fatal: insert succeeded
        return NextResponse.json({
          ok: true,
          inserted: ids.length,
          warn: e?.message || "Analyze failed",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, inserted: ids.length });
}
