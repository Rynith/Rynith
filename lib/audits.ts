import { supabaseService } from "./supabase-server";

export async function logAudit({
  org_id,
  user_id,
  action,
  target,
  meta,
}: {
  org_id: string;
  user_id?: string | null;
  action: string;
  target?: string | null;
  meta?: any;
}) {
  const supa = supabaseService();
  await supa
    .from("audit_log")
    .insert({ org_id, user_id, action, target, meta });
}
