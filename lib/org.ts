// lib/org.ts
import { supabaseService } from "./supabase-server";

export async function getOrgForUser(userId: string) {
  const supa = supabaseService();

  const { data, error } = await supa
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("org not found");
  }
  return data;
}

export async function getOrgOwnerEmail(org_id: string) {
  const supa = supabaseService();

  // 1) Get the owner membership row (no joins)
  const { data: owner, error: mErr } = await supa
    .from("org_members")
    .select("user_id")
    .eq("org_id", org_id)
    .eq("role", "owner")
    .maybeSingle();

  if (mErr || !owner?.user_id) return null;

  // 2) Use Admin API to fetch the auth user (email lives here)
  const { data: uData, error: uErr } = await supa.auth.admin.getUserById(
    owner.user_id
  );

  if (uErr || !uData?.user) return null;

  return uData.user.email ?? null;
}
