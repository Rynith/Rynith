import { supabaseService } from "./supabase-server";

export async function isPro(org_id: string) {
  const supa = supabaseService();
  const { data } = await supa
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("org_id", org_id)
    .maybeSingle();
  return data?.tier === "pro" && data?.status === "active";
}