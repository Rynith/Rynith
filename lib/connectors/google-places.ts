// lib/connectors/google-places.ts
import {
  fetchJson,
  upsertReviews,
  kickEmbedding,
  getCursor,
  setCursor,
} from "./util";

export async function syncPlaces(orgId: string, placeId: string) {
  const key = process.env.GOOGLE_PLACES_API_KEY!;
  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "reviews,url,rating,user_ratings_total");
  url.searchParams.set("key", key);

  const json = await fetchJson(url.toString());
  const det = json.result;
  const reviews = (det?.reviews ?? []) as any[];

  const rows = reviews.map((r) => ({
    org_id: orgId,
    source: "google_places" as const,
    external_id: `${placeId}:${r.time}`, // time (unix sec) is stable enough; ok for id
    author: r.author_name ?? null,
    rating: r.rating ?? null,
    text: r.text ?? null,
    url: det?.url ?? null,
    created_at_ext: r.relative_time_description ?? null,
    raw: r,
  }));

  const { ids } = await upsertReviews(rows);
  await kickEmbedding(ids);

  // No real pagination; store last sync time
  await setCursor(orgId, "google_places", {
    last_sync: new Date().toISOString(),
  });

  return { fetched: rows.length };
}
