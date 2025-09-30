// lib/billing.ts
import { supabaseAdmin } from "./supabase-admin";


export async function isOrgPro(org_id: string): Promise<boolean> {
  const admin = supabaseAdmin();
  const { data } = await admin
    .from("subscriptions")
    .select("tier, status")
    .eq("org_id", org_id)
    .maybeSingle();
  return (
    (data?.tier || "").toLowerCase() === "pro" &&
    (data?.status || "") !== "canceled"
  );
}