export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  applyRateLimitOr429,
  getCallerOrgId,
  getOrCreateCsvSource,
  mapRowsToReviews,
  triggerAnalyzeBackfill,
  upsertReviews,
  type IncomingRow,
} from "@/lib/reviews-ingest";

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "anon";
  const limited = applyRateLimitOr429(`ingest-manual:${ip}`, 60, 60_000);
  if (limited) return limited;

  let org_id: string;
  try {
    org_id = await getCallerOrgId();
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Unauthorized" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Accept either { rows: [...] } or [...]
  const rows: IncomingRow[] = Array.isArray(body)
    ? (body as IncomingRow[])
    : (body as any)?.rows;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json(
      { error: "Provide an array of rows" },
      { status: 400 }
    );
  }

  let source_id: string;
  try {
    source_id = await getOrCreateCsvSource(org_id);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Source create failed" },
      { status: 500 }
    );
  }

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

  triggerAnalyzeBackfill();

  return NextResponse.json({
    ok: true,
    inserted: reviewRows.length,
    source_id,
  });
}
