// lib/supabase-admin.ts
import { createClient } from "@supabase/supabase-js";

export function supabaseAdmin() {
  // Service-role bypasses RLS. NEVER expose this key to the client.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
