import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"
import { getCurrentOrgId } from "@/lib/org"

export async function POST(req: Request) {
  const supabase = supabaseServer()
  const org_id = await getCurrentOrgId()
  if (!org_id) return NextResponse.json({ error: "No org" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const retailerType = body?.retailerType as string | undefined

  const { error } = await supabase
    .from("organizations")
    .update({ config: { retailerType } })
    .eq("id", org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
