// app/api/sources/sync/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectors } from "@/lib/connectors";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  // ✅ no dynamic API lint
  const provided = (req.headers.get("x-internal-key") ?? "").trim();
  const expected = process.env.INTERNAL_SYNC_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Server misconfigured: INTERNAL_SYNC_KEY is not set" },
      { status: 500 }
    );
  }
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const kinds = Object.keys(connectors);
  const { data: sources, error } = await supabase
    .from("sources")
    .select("id, kind, status, next_sync_at, sync_cursor, org_id")
    .in("kind", kinds.length ? kinds : ["email"])
    .eq("status", "connected")
    .or(`next_sync_at.is.null,next_sync_at.lte.${now}`)
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!sources?.length) return NextResponse.json({ ok: true, ran: 0, inserted: 0 });

  let ran = 0, inserted = 0;
  for (const s of sources) {
    const connector = connectors[s.kind];
    if (!connector?.sync) {
      await supabase.from("sources").update({
        error: `no connector implemented for kind=${s.kind}`,
        next_sync_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }).eq("id", s.id);
      continue;
    }
    try {
      const res = await connector.sync({ sourceId: s.id, since: null });
      inserted += res.inserted || 0;
      await supabase.from("sources").update({
        last_sync_at: new Date().toISOString(),
        next_sync_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        sync_cursor: res.nextCursor ?? s.sync_cursor,
        error: null,
      }).eq("id", s.id);
      ran++;
    } catch (e: any) {
      await supabase.from("sources").update({
        error: e?.message || "sync failed",
        next_sync_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }).eq("id", s.id);
    }
  }

  return NextResponse.json({ ok: true, ran, inserted });
}
