// app/api/export/route.ts Export CSV (Pro-only)
export const runtime = "nodejs";

import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isOrgPro } from "@/lib/billing";

function j(status: number, payload: any) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function GET() {
  // Identify user
  const anon = await supabaseServer();
  const { data: auth } = await anon.auth.getUser();
  if (!auth?.user) return j(401, { error: "Unauthorized" });

  // Resolve org
  const admin = supabaseAdmin();
  const { data: mem } = await admin
    .from("org_members")
    .select("org_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const org_id = mem?.org_id as string | undefined;
  if (!org_id) return j(400, { error: "No org" });

  // ✅ Pro gate
  if (!(await isOrgPro(org_id))) return j(402, { error: "Pro required" });

  // ...build CSV and return it
  return j(200, { ok: true });
}
