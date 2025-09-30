export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  applyRateLimitOr429,
  guardSizeAndType,
  getCallerOrgId,
  getOrCreateCsvSource,
  mapRowsToReviews,
  parseCsvText,
  triggerAnalyzeBackfill,
  upsertReviews,
} from "@/lib/reviews-ingest";

export async function POST(req: Request) {
  // Rate limit (per IP best-effort)
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "anon";
  const limited = applyRateLimitOr429(`ingest-csv:${ip}`, 20, 60_000);
  if (limited) return limited;

  // Guard size + content type
  const guard = guardSizeAndType(req, 5_000_000, ["multipart/form-data"]);
  if (!("ok" in guard) || !guard.ok) return guard.res;

  // Auth + org
  let org_id: string;
  try {
    org_id = await getCallerOrgId();
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Unauthorized" },
      { status: 401 }
    );
  }

  // Pull file
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file)
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  // Parse CSV
  const csvText = await file.text();
  const { rows, errors } = parseCsvText(csvText);
  if (errors.length) {
    return NextResponse.json(
      { error: "CSV parse error", details: errors.slice(0, 3) },
      { status: 400 }
    );
  }
  if (!rows.length)
    return NextResponse.json({ error: "No rows found" }, { status: 400 });

  // Ensure source
  let source_id: string;
  try {
    source_id = await getOrCreateCsvSource(org_id);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Source create failed" },
      { status: 500 }
    );
  }

  // Map + upsert
  const reviewRows = mapRowsToReviews(org_id, source_id, rows);
  if (!reviewRows.length)
    return NextResponse.json({ error: "No valid rows" }, { status: 400 });

  try {
    await upsertReviews(reviewRows);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Insert failed" },
      { status: 500 }
    );
  }

  // Kick off backfill (non-blocking)
  triggerAnalyzeBackfill();

  return NextResponse.json({
    ok: true,
    inserted: reviewRows.length,
    source_id,
  });
}
