// app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server"
import { supabaseServer } from "@/lib/supabase-server"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") || "/dashboard"

  const supabase = await supabaseServer()

  if (code) {
    await supabase.auth.exchangeCodeForSession(code)

    // Run onboarding logic server-side (same as API route, inlined)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: existing } = await supabase
        .from("org_members")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)

      if (!existing || existing.length === 0) {
        const orgName = user.email?.split("@")[0] ? `${user.email!.split("@")[0]}'s Org` : "My Organization"
        const { data: orgRow } = await supabase
          .from("organizations")
          .insert({ name: orgName })
          .select("id")
          .single()

        if (orgRow) {
          await supabase
            .from("org_members")
            .insert({ org_id: orgRow.id, user_id: user.id, role: "owner" })
        }
      }
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
