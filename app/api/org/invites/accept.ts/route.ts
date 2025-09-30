export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

async function accept(invite_id: string, req: Request) {
  const supa = await supabaseServer();

  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load invite (RLS lets recipient see it because email == auth.email)
  const { data: inv, error } = await supa
    .from("invites")
    .select("id, org_id, email, role, accepted_at")
    .eq("id", invite_id)
    .maybeSingle();

  if (error || !inv)
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });

  // Email must match
  if (
    (inv.email || "").toLowerCase() !== (auth.user.email || "").toLowerCase()
  ) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
  }

  // If already accepted, just succeed
  if (inv.accepted_at) {
    return NextResponse.json({ ok: true, org_id: inv.org_id, already: true });
  }

  // Add to org_members (user inserts self; RLS allows)
  // If already exists, we keep existing role (no downgrade/escalation here)
  const { data: existing } = await supa
    .from("org_members")
    .select("role")
    .eq("org_id", inv.org_id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await supa
      .from("org_members")
      .insert({ org_id: inv.org_id, user_id: auth.user.id, role: inv.role });
    if (insErr)
      return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  // Mark invite accepted (RLS allows recipient update)
  const { error: upErr } = await supa
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inv.id);

  if (upErr)
    return NextResponse.json({ error: upErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, org_id: inv.org_id });
}

export async function GET(req: NextRequest) {
  const invite_id = req.nextUrl.searchParams.get("invite_id") || "";
  if (!invite_id)
    return NextResponse.json({ error: "Missing invite_id" }, { status: 400 });
  const res = await accept(invite_id, req);
  // If you prefer redirect UX:
  // if ((res as any).status === 200) return NextResponse.redirect(new URL("/dashboard", req.url));
  return res;
}

export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const invite_id = String(body.invite_id || "");
  if (!invite_id)
    return NextResponse.json({ error: "Missing invite_id" }, { status: 400 });
  return accept(invite_id, req);
}
