// lib/connectors/google-gbp.ts
import {
  fetchJson,
  getCursor,
  setCursor,
  upsertReviews,
  kickEmbedding,
} from "./util";

type GBPReview = {
  name: string; // locations/{locationId}/reviews/{reviewId}
  reviewId: string;
  comment?: string;
  starRating?: string; // "FIVE" -> 5
  createTime?: string;
  reviewer?: { displayName?: string };
};

function ratingFromStar(s?: string): number | null {
  if (!s) return null;
  const map: Record<string, number> = {
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FOUR: 4,
    FIVE: 5,
  };
  return map[s] ?? null;
}

export async function syncGBP(orgId: string, locationName: string) {
  // locationName like: "locations/12345678901234567890"
  const { credentials, cursor } = await getCursor(orgId, "google_gbp");
  const accessToken = credentials?.access_token as string;
  if (!accessToken) throw new Error("Missing Google access_token");

  // GBP API v4-ish endpoint (accounts/locations vary by version). Using: mybusiness.googleapis.com/v4
  // If you store accountId + locationId, build name = accounts/{a}/locations/{l}; adjust accordingly.
  const pageToken = cursor?.pageToken ?? undefined;
  const url = new URL(
    `https://mybusiness.googleapis.com/v4/${locationName}/reviews`
  );
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  url.searchParams.set("pageSize", "100");

  const json = await fetchJson(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const reviews: GBPReview[] = json.reviews ?? [];
  const rows = reviews.map((r) => ({
    org_id: orgId,
    source: "google_gbp" as const,
    external_id: r.reviewId,
    author: r.reviewer?.displayName ?? null,
    rating: ratingFromStar(r.starRating),
    text: r.comment ?? null,
    url: null, // GBP doesn't provide a public URL per review
    created_at_ext: r.createTime ?? null,
    raw: r,
  }));

  const { ids } = await upsertReviews(rows);
  await kickEmbedding(ids);

  const nextPageToken = json.nextPageToken ?? null;
  await setCursor(orgId, "google_gbp", { pageToken: nextPageToken });
  return { fetched: rows.length, nextPageToken };
}
