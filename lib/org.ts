import { supabaseServer } from "@/lib/supabase-server"

export async function getCurrentOrgId(): Promise<string | null> {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .single()
  return data?.org_id ?? null
}
