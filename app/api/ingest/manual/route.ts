export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { contentExternalId, normalize } from "@/lib/hash";

type Item = {
  author?: string | null;
  body: string;
  rating?: number | null;
  published_at?: string | null;
  external_id?: string | null;
};

export async function POST(req: Request) {
  try {
    // 1) auth for internal ingestion
    const provided = (req.headers.get("x-internal-key") || "").trim();
    const expected = process.env.INTERNAL_SYNC_KEY;
    if (!expected)
      return NextResponse.json(
        { error: "Missing INTERNAL_SYNC_KEY" },
        { status: 500 }
      );
    if (provided !== expected)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 2) parse payload
    const body = await req.json();
    const org_id = String(body.org_id || "").trim();
    const items: Item[] = Array.isArray(body.items) ? body.items : [];

    if (!org_id)
      return NextResponse.json({ error: "org_id required" }, { status: 400 });
    if (!items.length)
      return NextResponse.json({ error: "items required" }, { status: 400 });

    const sb = supabaseAdmin();

    // 3) ensure a source row exists
    const { data: existing } = await sb
      .from("sources")
      .select("id")
      .eq("org_id", org_id)
      .eq("kind", "email")
      .maybeSingle();

    let source_id = existing?.id;
    if (!source_id) {
      const { data: created, error: sErr } = await sb
        .from("sources")
        .insert({
          org_id,
          kind: "email",
          display_name: "Email/Paste",
          status: "connected",
          next_sync_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sErr)
        return NextResponse.json({ error: sErr.message }, { status: 500 });
      source_id = created.id;
    }

    // 4) build review rows (idempotent external_id)
    const now = new Date().toISOString();
    const rows = items
      .map((it) => {
        const author = it.author ?? null;
        const bodyText = (it.body || "").toString();
        const published_at = it.published_at ?? now;
        const eid =
          (it.external_id && normalize(String(it.external_id))) ||
          contentExternalId(author, bodyText, published_at);

        return {
          org_id,
          source_id,
          external_id: eid,
          author,
          rating: Number.isFinite(it.rating as any) ? Number(it.rating) : null,
          title: null,
          body: bodyText,
          language: "en",
          published_at,
        };
      })
      .filter((r) => r.body && r.body.trim().length > 0);

    if (!rows.length)
      return NextResponse.json({ error: "no valid rows" }, { status: 400 });

    // 5) upsert
    const { error: upErr, count } = await sb
      .from("reviews")
      .upsert(rows, {
        onConflict: "org_id,source_id,external_id",
        ignoreDuplicates: true,
      });

    if (upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 });

    // 6) optional: kick analysis (ignore failures)
    const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
    if (base) fetch(`${base}/api/analyze`, { method: "POST" }).catch(() => {});

    return NextResponse.json({ ok: true, inserted: count ?? rows.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Internal error" },
      { status: 500 }
    );
  }
}
