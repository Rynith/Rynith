import type { Connector, SyncResult, MappedReview } from "./types";

/**
 * Modes:
 *  - GBP OAuth: source_credentials.data = { refresh_token: "..." }, sources.config = { locationName: "accounts/xxx/locations/yyy" }
 *  - Places API: sources.config = { place_id: "..." }, env GOOGLE_PLACES_API_KEY
 */
export const googleConnector: Connector = {
  kind: "google",
  async sync({
    org_id,
    source_id,
    cursor,
    since,
    config,
    credentials,
  }): Promise<SyncResult> {
    const rows: MappedReview[] = [];
    let nextCursor: string | null = null;

    // Prefer GBP if we have a refresh_token
    if (credentials?.refresh_token) {
      // 1) refresh access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
          client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
          grant_type: "refresh_token",
          refresh_token: credentials.refresh_token,
        }),
      });
      if (!tokenRes.ok) throw new Error("google oauth refresh failed");
      const tok = await tokenRes.json();

      // 2) list reviews
      const locationName = String(config?.locationName || "").trim();
      if (!locationName)
        throw new Error("missing GBP locationName in sources.config");

      const url = new URL(
        `https://mybusiness.googleapis.com/v4/${locationName}/reviews`
      );
      if (cursor) url.searchParams.set("pageToken", cursor);
      // GBP returns most-recent first; since filtering server-side is limited
      const res = await fetch(url.toString(), {
        headers: { authorization: `Bearer ${tok.access_token}` },
      });
      if (!res.ok) throw new Error(`google reviews list failed: ${res.status}`);
      const json = await res.json();

      for (const r of json.reviews ?? []) {
        rows.push({
          external_id: String(r.reviewId),
          org_id,
          source_id,
          rating: Number(r.starRating ?? null) || null,
          author: r.reviewer?.displayName ?? null,
          text: r.comment ?? "",
          url: r.reviewReplyLink || null,
          published_at: r.createTime ?? null,
          raw: r,
        });
      }
      nextCursor = json.nextPageToken ?? null;
      return { reviews: rows, nextCursor };
    }

    // Otherwise Places API (API key)
    const placeId = String(config?.place_id || "").trim();
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!placeId || !key) return { reviews: [], nextCursor: null }; // quietly no-op

    // Places API v1 (new) via "places:reviews:list" is not generally open.
    // We’ll use the legacy details endpoint which still serves reviews in many regions.
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/details/json"
    );
    url.searchParams.set("place_id", placeId);
    url.searchParams.set("fields", "review"); // limited, but returns reviews
    url.searchParams.set("key", key);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`places details failed: ${res.status}`);
    const data = await res.json();

    const reviews = data?.result?.reviews ?? [];
    for (const r of reviews) {
      rows.push({
        external_id: String(r.time), // not ideal; better if you can combine author_url+time
        org_id,
        source_id,
        rating: Number(r.rating) || null,
        author: r.author_name ?? null,
        text: r.text ?? "",
        url: r.author_url ?? null,
        published_at: r.relative_time_description ? null : null, // Places often lacks ISO; you can convert from epoch if present
        raw: r,
      });
    }
    // No cursor in legacy details; you can switch to “next_page_token” from /textsearch if you pivot strategies.
    nextCursor = null;
    return { reviews: rows, nextCursor };
  },
};
