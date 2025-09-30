// app/api/org/config/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server"; // anon, cookie-bound
import { supabaseAdmin } from "@/lib/supabase-admin"; // service role

type Body = {
  ensure?: boolean;
  industry?: string;
  name?: string;
};

function defaultOrgName(email: string | null | undefined) {
  if (!email) return "My Organization";
  const local = email
    .split("@")[0]
    ?.replace(/[^a-z0-9]+/gi, " ")
    .trim();
  return local ? `${local}'s Organization` : "My Organization";
}

export async function POST(req: Request) {
  // 1) Read current user from session cookies (anon client)
  const anon = await supabaseServer();
  const { data: auth } = await anon.auth.getUser();
  const user = auth?.user;
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2) Parse body (but it's optional)
  let body: Body = {};
  try {
    body = await req.json();
  } catch {}

  // 3) Use admin client for all DB work (bypasses RLS)
  const admin = supabaseAdmin();

  // 3a) If already a member, optionally update org config.industry and return
  const { data: memRows, error: memCheckErr } = await admin
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (memCheckErr) {
    return NextResponse.json({ error: memCheckErr.message }, { status: 400 });
  }

  const existingOrgId = memRows?.[0]?.org_id ?? null;
  if (existingOrgId) {
    if (body.industry) {
      // merge config safely: read current, shallow-merge, update
      const { data: org } = await admin
        .from("organizations")
        .select("config")
        .eq("id", existingOrgId)
        .maybeSingle();

      const nextConfig = { ...(org?.config ?? {}), industry: body.industry };

      await admin
        .from("organizations")
        .update({ config: nextConfig })
        .eq("id", existingOrgId);
    }
    return NextResponse.json({ ok: true, isNew: false, org_id: existingOrgId });
  }

  // 3b) Create new org with guaranteed name
  const orgName =
    (body.name?.trim() || "").slice(0, 120) || defaultOrgName(user.email);
  const cfg = body.industry ? { industry: body.industry } : {};

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({ name: orgName, config: cfg })
    .select("id")
    .single();

  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 400 });
  }

  // 3c) Add the current user as owner
  const { error: memErr } = await admin
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" });

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, isNew: true, org_id: org.id });
}
