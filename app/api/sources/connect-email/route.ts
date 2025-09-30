// app/api/sources/connect-email/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: mem } = await supa
    .from("org_members")
    .select("org_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!mem?.org_id)
    return NextResponse.json({ error: "No org" }, { status: 400 });

  const org_id = mem.org_id as string;

  // find existing email source
  const { data: existing } = await supa
    .from("sources")
    .select("id, config")
    .eq("org_id", org_id)
    .eq("kind", "email")
    .maybeSingle();

  const domain = process.env.EMAIL_INBOUND_DOMAIN || "inbound.local";
  const alias =
    (existing?.config as any)?.alias ??
    `reviews+${org_id.slice(0, 8)}@${domain}`;

  if (existing?.id) {
    // ensure alias is saved
    if (!existing.config || !existing.config["alias"]) {
      await supa
        .from("sources")
        .update({ config: { ...(existing.config ?? {}), alias } })
        .eq("id", existing.id);
    }
    return NextResponse.json({ ok: true, alias });
  }

  // create new email source
  const { error: insErr } = await supa.from("sources").insert({
    org_id,
    kind: "email",
    display_name: "Email Ingestion",
    config: { alias },
    status: "connected",
  });
  if (insErr)
    return NextResponse.json({ error: insErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, alias });
}
