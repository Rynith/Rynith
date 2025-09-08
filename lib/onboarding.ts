// /lib/onboarding.ts
import type { SupabaseClient } from "@supabase/supabase-js"

export async function ensureOrgForCurrentUser(supabase: SupabaseClient) {
  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) return { error: "Unauthorized" as const }

  // already a member?
  const { data: existing, error: memErr } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)

  if (memErr) return { error: memErr.message as const }
  if (existing && existing.length) {
    return { ok: true as const, org_id: existing[0].org_id, isNew: false as const }
  }

  // create org + add user as owner
  const orgName =
    user.email?.split("@")[0] ? `${user.email!.split("@")[0]}'s Org` : "My Organization"

  const { data: orgRow, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single()

  if (orgErr || !orgRow) return { error: orgErr?.message || "Failed to create org" as const }

  const { error: addErr } = await supabase
    .from("org_members")
    .insert({ org_id: orgRow.id, user_id: user.id, role: "owner" })

  if (addErr) return { error: addErr.message as const }

  return { ok: true as const, org_id: orgRow.id, isNew: true as const }
}
