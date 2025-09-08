// app/api/sources/connect-email/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getCurrentOrgId } from "@/lib/org";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Basic rate limit (per IP): 5 requests / minute
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "local";
  const rl = rateLimit(`connect-email:${ip}`, 5, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const supabase = supabaseServer();
  const org_id = await getCurrentOrgId();
  if (!org_id) return NextResponse.json({ error: "No org" }, { status: 401 });

  // TODO: set your real domain here (or read from env)
  const alias = `reviews+${org_id}@yourdomain.com`;

  // Merge org config (don’t overwrite previous keys like retailerType)
  const { data: orgRow, error: orgSelErr } = await supabase
    .from("organizations")
    .select("config")
    .eq("id", org_id)
    .single();
  if (orgSelErr) return NextResponse.json({ error: orgSelErr.message }, { status: 500 });

  const newOrgConfig = { ...(orgRow?.config ?? {}), emailAlias: alias, ingestion: "email" };
  const { error: orgUpdErr } = await supabase
    .from("organizations")
    .update({ config: newOrgConfig })
    .eq("id", org_id);
  if (orgUpdErr) return NextResponse.json({ error: orgUpdErr.message }, { status: 500 });

  // Upsert source row for email
  const { data: existingSource } = await supabase
    .from("sources")
    .select("id, config")
    .eq("org_id", org_id)
    .eq("kind", "email")
    .maybeSingle();

  let sourceId: string | undefined;

  if (!existingSource?.id) {
    const { data: ins, error: insErr } = await supabase
      .from("sources")
      .insert({
        org_id,
        kind: "email",
        display_name: "Email Forwarding",
        config: { alias },
        status: "connected",
        next_sync_at: new Date().toISOString(), // pick up right away
      })
      .select("id")
      .single();
    if (insErr || !ins) return NextResponse.json({ error: insErr?.message || "Failed to create source" }, { status: 500 });
    sourceId = ins.id;
  } else {
    const mergedSourceConfig = { ...(existingSource.config ?? {}), alias };
    const { error: updErr } = await supabase
      .from("sources")
      .update({
        display_name: "Email Forwarding",
        config: mergedSourceConfig,
        status: "connected",
        next_sync_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", existingSource.id);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
    sourceId = existingSource.id;
  }

  return NextResponse.json({ ok: true, alias, source_id: sourceId });
}
