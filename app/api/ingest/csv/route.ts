// app/api/ingest/csv/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import Papa from "papaparse";
import { contentExternalId, normalize } from "@/lib/hash";

type CsvRow = {
  rating?: string | number;
  title?: string;
  body?: string;
  review?: string;
  published_at?: string;
  author?: string;
  external_id?: string | number;
};

function toNumber(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : null;
}

function toISO(s?: string) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(req: Request) {
  // reject huge uploads (~5MB)
  if (Number(req.headers.get("content-length") || 0) > 5_000_000) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const csvText = await file.text();
  const parsed = Papa.parse<CsvRow>(csvText, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    return NextResponse.json(
      { error: "CSV parse error", details: parsed.errors.slice(0, 3) },
      { status: 400 }
    );
  }
  const rows = parsed.data || [];

  // find user's org
  const { data: member, error: memErr } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (memErr || !member) {
    return NextResponse.json({ error: "No org membership found" }, { status: 400 });
  }
  const org_id = member.org_id as string;

  // ensure a CSV source
  let source_id: string;
  const { data: src1 } = await supabase
    .from("sources")
    .select("id")
    .eq("org_id", org_id)
    .eq("kind", "csv")
    .limit(1)
    .maybeSingle();

  if (src1?.id) {
    source_id = src1.id;
  } else {
    const { data: src2, error: srcErr } = await supabase
      .from("sources")
      .insert({ org_id, kind: "csv", display_name: "CSV Upload", config: {} })
      .select("id")
      .single();
    if (srcErr || !src2) {
      return NextResponse.json({ error: "Failed to create source" }, { status: 500 });
    }
    source_id = src2.id;
  }

  // map rows -> reviews (with content hash fallback for external_id)
  const reviewRows = rows
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

  if (!reviewRows.length) {
    return NextResponse.json({ error: "No valid rows found" }, { status: 400 });
  }

  // upsert = idempotent, ignores duplicates via unique index (org_id,source_id,external_id)
  const { error: upErr } = await supabase.from("reviews").upsert(reviewRows, {
    onConflict: "org_id,source_id,external_id",
    ignoreDuplicates: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, inserted: reviewRows.length, source_id });
}
