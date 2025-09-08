// /lib/supabase-browser.ts
"use client"
import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
// import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | undefined

export function supabaseBrowser(): SupabaseClient {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}

export default supabaseBrowser