import type { Connector, SyncResult, MappedReview } from "./types";

/**
 * Requires:
 *  - env YELP_API_KEY
 *  - sources.config = { business_id: "yelp-business-id" }
 */
export const yelpConnector: Connector = {
  kind: "yelp",
  async sync({ org_id, source_id, cursor, config }): Promise<SyncResult> {
    const key = process.env.YELP_API_KEY!;
    const biz = String(config?.business_id || "").trim();
    if (!key || !biz) return { reviews: [], nextCursor: null };

    // Yelp reviews endpoint (3 reviews per call; no pagination for more).
    const url = `https://api.yelp.com/v3/businesses/${encodeURIComponent(
      biz
    )}/reviews`;
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`yelp reviews failed: ${res.status}`);
    const json = await res.json();

    const rows: MappedReview[] = (json.reviews ?? []).map((r: any) => ({
      external_id: String(r.id),
      org_id,
      source_id,
      rating: Number(r.rating) || null,
      author: r.user?.name ?? null,
      text: r.text ?? "",
      url: r.url ?? null,
      published_at: r.time_created ?? null,
      raw: r,
    }));

    // Yelp doesn’t paginate reviews here; for deeper history you need their partner exports.
    return { reviews: rows, nextCursor: null };
  },
};
