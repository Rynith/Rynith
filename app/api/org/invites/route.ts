export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server"; // cookie-bound (for session)
import { supabaseAdmin } from "@/lib/supabase-admin"; // service role (bypass RLS)
import { sendInviteEmail } from "@/lib/emails/invite-email";

type Role = "owner" | "admin" | "member";
const ROLES: Role[] = ["owner", "admin", "member"];

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function getContext(req: Request) {
  const anon = await supabaseServer();
  const { data: auth } = await anon.auth.getUser();
  const me = auth?.user;
  if (!me) return { error: j(401, { error: "Unauthorized" }) };

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: j(500, { error: "Server misconfigured: service key missing" }),
    };
  }
  const admin = supabaseAdmin();

  // caller's org + role (latest)
  const { data: myRows, error: memErr } = await admin
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (memErr) return { error: j(400, { error: memErr.message }) };
  const org_id = myRows?.[0]?.org_id as string | undefined;
  const myRole = myRows?.[0]?.role as Role | undefined;
  if (!org_id) return { error: j(400, { error: "No org membership" }) };

  // Base URL for accept link
  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

  return { me, org_id, myRole, admin, base };
}

// GET /api/org/invites  -> list outstanding invites (this org)
export async function GET(req: Request) {
  const ctx = await getContext(req);
  if ("error" in ctx) return ctx.error;
  const { org_id, admin } = ctx;

  const { data, error } = await admin
    .from("invites")
    .select("id, email, role, created_at, accepted_at")
    .eq("org_id", org_id)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) return j(400, { error: error.message });
  return j(200, { ok: true, invites: data ?? [] });
}

// POST /api/org/invites  -> create invite (owner/admin only)
export async function POST(req: Request) {
  const ctx = await getContext(req);
  if ("error" in ctx) return ctx.error;
  const { org_id, myRole, admin, base } = ctx;

  if (!["owner", "admin"].includes(myRole || ""))
    return j(403, { error: "Forbidden" });

  let body: { email?: string; role?: Role } = {};
  try {
    body = await req.json();
  } catch {}

  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const role = (body.role || "member") as Role;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return j(400, { error: "Valid email required" });
  if (!ROLES.includes(role)) return j(400, { error: "Invalid role" });

  // Insert invite (unique index (org_id, lower(email)) where accepted_at is null prevents dupes)
  const { data: created, error } = await admin
    .from("invites")
    .insert({ org_id, email, role })
    .select("id")
    .single();

  if (error) {
    // Duplicate pending invite -> 409 conflict is nicer for the UI
    if (
      error.message.toLowerCase().includes("duplicate") ||
      error.code === "23505"
    )
      return j(409, { error: "Invite already pending for this email" });
    return j(400, { error: error.message });
  }

  const accept_url = `${base}/api/org/invites/accept?invite_id=${created!.id}`;
  // TODO: plug email provider if/when ready
  return j(200, { ok: true, id: created!.id, accept_url });
}
