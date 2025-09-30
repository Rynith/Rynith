// app/api/org/members/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server"; // cookie-bound anon: ONLY for auth.getUser()
import { supabaseAdmin } from "@/lib/supabase-admin"; // service-role: bypasses RLS

type Role = "owner" | "admin" | "member";

function json(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function getContext() {
  // 1) Identify the signed-in user from cookies (anon client)
  const anon = await supabaseServer();
  const { data: auth } = await anon.auth.getUser();
  const me = auth?.user;
  if (!me) return { error: json(401, { error: "Unauthorized" }) };

  // 2) Use service-role for all DB calls (no RLS issues)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: json(500, {
        error: "Server misconfigured: service role key missing",
      }),
    };
  }
  const admin = supabaseAdmin();

  // 3) Find caller's org + role (latest membership wins)
  const { data: myRows, error: memErr } = await admin
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (memErr) return { error: json(400, { error: memErr.message }) };

  const org_id = myRows?.[0]?.org_id as string | undefined;
  const myRole = myRows?.[0]?.role as Role | undefined;
  if (!org_id) return { error: json(400, { error: "No org membership" }) };

  return { me, org_id, myRole, admin };
}

// ------------------------------- GET: list members -------------------------------
export async function GET() {
  const ctx = await getContext();
  if ("error" in ctx) return ctx.error;
  const { org_id, admin } = ctx;

  const { data: rows, error } = await admin
    .from("org_members")
    .select("user_id, role, created_at")
    .eq("org_id", org_id)
    .order("created_at", { ascending: true });

  if (error) return json(400, { error: error.message });

  // Fetch emails via Auth Admin API (no dependency on public users table)
  const members = await Promise.all(
    (rows ?? []).map(async (r) => {
      let email: string | null = null;
      try {
        const { data } = await admin.auth.admin.getUserById(
          r.user_id as string
        );
        email = data?.user?.email ?? null;
      } catch {
        // keep email = null if lookup fails
      }
      return {
        user_id: r.user_id as string,
        role: r.role as Role,
        email,
        joined_at: r.created_at as string,
      };
    })
  );

  return json(200, { ok: true, org_id, members });
}

// ----------------------------- PATCH: change role ------------------------------
export async function PATCH(req: Request) {
  const ctx = await getContext();
  if ("error" in ctx) return ctx.error;
  const { org_id, myRole, admin } = ctx;

  if (!["owner", "admin"].includes((myRole ?? "") as string)) {
    return json(403, { error: "Forbidden" });
  }

  let body: { user_id?: string; role?: Role } = {};
  try {
    body = await req.json();
  } catch {}

  const targetUserId = (body.user_id || "").trim();
  const newRole = body.role;
  if (!targetUserId || !newRole) {
    return json(400, { error: "user_id and role are required" });
  }

  const { data: tgt } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", org_id)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!tgt) return json(404, { error: "Target not found" });

  // Prevent demoting the last owner
  if (tgt.role === "owner" && newRole !== "owner") {
    const { count: owners } = await admin
      .from("org_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", org_id)
      .eq("role", "owner");
    if ((owners ?? 0) <= 1) {
      return json(400, { error: "Cannot demote the last owner" });
    }
  }

  const { error } = await admin
    .from("org_members")
    .update({ role: newRole })
    .eq("org_id", org_id)
    .eq("user_id", targetUserId);

  if (error) return json(400, { error: error.message });
  return json(200, { ok: true });
}

// ----------------------------- DELETE: remove member ---------------------------
export async function DELETE(req: Request) {
  const ctx = await getContext();
  if ("error" in ctx) return ctx.error;
  const { org_id, myRole, admin } = ctx;

  if (!["owner", "admin"].includes((myRole ?? "") as string)) {
    return json(403, { error: "Forbidden" });
  }

  let body: { user_id?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const targetUserId = String(body.user_id || "").trim();
  if (!targetUserId) return json(400, { error: "user_id is required" });

  // Make sure target exists
  const { data: tgt, error: tgtErr } = await admin
    .from("org_members")
    .select("user_id, role")
    .eq("org_id", org_id)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (tgtErr) return json(400, { error: tgtErr.message });
  if (!tgt) return json(404, { error: "Target not found" });

  // Prevent removing the last owner
  const { count: ownersCount, error: ownersErr } = await admin
    .from("org_members")
    .select("user_id", { count: "exact", head: true })
    .eq("org_id", org_id)
    .eq("role", "owner");
  if (ownersErr) return json(400, { error: ownersErr.message });
  if (tgt.role === "owner" && (ownersCount ?? 0) <= 1) {
    return json(400, { error: "Cannot remove the last owner" });
  }

  // Delete
  const { error: delErr } = await admin
    .from("org_members")
    .delete()
    .eq("org_id", org_id)
    .eq("user_id", targetUserId);
  if (delErr) return json(400, { error: delErr.message });

  return json(200, {
    ok: true,
    message: "member_removed",
    user_id: targetUserId,
  });
}
