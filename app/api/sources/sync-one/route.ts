// app/api/sources/sync-one/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";   // for user auth + membership check
import { supabaseAdmin } from "@/lib/supabase-admin";     // service-role to run connector + update
import { connectors } from "@/lib/connectors";
import { rateLimit } from "@/lib/rate-limits";

export async function POST(req: Request) {
  // optional: per-IP throttle
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "local";
  const rl = rateLimit(`sync-one:${ip}`, 10, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supa = await supabaseServer();

  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceId } = await req.json().catch(() => ({}));
  if (!sourceId) return NextResponse.json({ error: "Missing sourceId" }, { status: 400 });

  // Load the source (kind/org/cursor)
  const { data: src, error: sErr } = await supa
    .from("sources")
    .select("id, kind, org_id, sync_cursor, status")
    .eq("id", sourceId)
    .single();
  if (sErr || !src) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  // Ensure the user belongs to this org
  const { data: mem } = await supa
    .from("org_members")
    .select("id")
    .eq("org_id", src.org_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!mem) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connector = connectors[src.kind];
  if (!connector || !connector.sync) {
    return NextResponse.json({ error: `No connector for kind=${src.kind}` }, { status: 400 });
  }

  const admin = supabaseAdmin();
  try {
    const res = await connector.sync({ sourceId: src.id, since: null });

    await admin.from("sources").update({
      last_sync_at: new Date().toISOString(),
      next_sync_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      sync_cursor: res.nextCursor ?? src.sync_cursor,
      error: null,
      status: "connected",
    }).eq("id", src.id);

    return NextResponse.json({ ok: true, inserted: res.inserted ?? 0 });
  } catch (e: any) {
    await admin.from("sources").update({
      error: e?.message || "sync failed",
      next_sync_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // backoff
    }).eq("id", src.id);

    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}