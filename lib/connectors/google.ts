// /lib/connectors/google.ts
import type { Connector, SyncResult } from "./types"
import { createClient } from "@supabase/supabase-js"

export const googleConnector: Connector = {
  kind: "google",
  async sync({ sourceId }): Promise<SyncResult> {
    // Service-role client (bypasses RLS). Use env keys here.
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    // 1) Load credentials
    const { data: creds } = await supa.from("source_credentials").select("data").eq("source_id", sourceId).single()
    if (!creds) throw new Error("missing credentials")
    // 2) Exchange refresh_token for access_token (Google OAuth)
    // 3) Call Business Profile API: list accounts/locations/reviews
    //    GET: accounts.locations.reviews.list(...)
    // 4) Map to your `reviews` rows. Use provider review id as `external_id`.
    // 5) Insert with org_id & source_id. Let your unique index prevent duplicates.
    // 6) Return { inserted, nextCursor } if the API paginates.

    // Stub:
    const inserted = 0
    return { inserted, nextCursor: null }
  },
}