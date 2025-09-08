// app/api/onboarding/route.ts
import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function POST() {
  const supabase = supabaseServer()

  const { data: { user }, error: userErr } = await supabase.auth.getUser()
  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Do they already belong to an org?
  const { data: existing, error: memErr } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)

  if (memErr) {
    return NextResponse.json({ error: memErr.message }, { status: 400 })
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, org_id: existing[0].org_id, isNew: false })
  }

  // Create a new org and add the user as owner
  const orgName = user.email?.split("@")[0] ? `${user.email!.split("@")[0]}'s Org` : "My Organization"
  const { data: orgRow, error: orgErr } = await supabase
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single()

  if (orgErr || !orgRow) {
    return NextResponse.json({ error: orgErr?.message || "Failed to create org" }, { status: 400 })
  }

  const { error: addErr } = await supabase
    .from("org_members")
    .insert({ org_id: orgRow.id, user_id: user.id, role: "owner" })

  if (addErr) {
    return NextResponse.json({ error: addErr.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true, org_id: orgRow.id, isNew: true })
}
