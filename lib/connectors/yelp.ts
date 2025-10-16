import {
  fetchJson,
  upsertReviews,
  kickEmbedding,
  getCursor,
  setCursor,
} from "./util";

/**
 * Pulls Yelp business metadata (rating, review_count) and, if your key has access,
 * the 3 most recent text reviews. If not, it just stores a synthetic “rating summary”
 * review so your UI can still surface Yelp signal without text.
 */
export async function syncYelp(orgId: string, idOrAlias: string) {
  if (!orgId) throw new Error("orgId required");
  if (!idOrAlias) throw new Error("business idOrAlias required");

  const key = process.env.YELP_API_KEY!;
  const headers = { Authorization: `Bearer ${key}` };

  // Business details (always available)
  const detailsUrl = `https://api.yelp.com/v3/businesses/${encodeURIComponent(
    idOrAlias
  )}`;
  const biz = await fetchJson(detailsUrl, { headers });

  const name = biz?.name as string | undefined;
  const rating = typeof biz?.rating === "number" ? biz.rating : null;
  const reviewCount =
    typeof biz?.review_count === "number" ? biz.review_count : null;
  const alias = (biz?.alias as string) || idOrAlias;

  let rows: any[] = [];

  // Try reviews endpoint (often blocked)
  try {
    const reviewsUrl = `https://api.yelp.com/v3/businesses/${encodeURIComponent(
      alias
    )}/reviews?locale=en_US`;
    const json = await fetchJson(reviewsUrl, { headers });
    const reviews = (json?.reviews ?? []) as any[];

    rows = reviews.map((r: any) => ({
      org_id: orgId,
      source: "yelp" as const,
      external_id: r.id,
      author: r.user?.name ?? null,
      rating: typeof r.rating === "number" ? r.rating : null,
      text: r.text ?? null,
      url: r.url ?? null,
      created_at_ext: r.time_created ?? null,
      raw: r,
    }));
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    // Known behavior: 404 NOT_FOUND for reviews with standard keys
    if (/HTTP 404/.test(msg)) {
      // Create a synthetic “summary” row so you still see Yelp signal
      rows = [
        {
          org_id: orgId,
          source: "yelp" as const,
          external_id: `yelp:meta:${alias}`,
          author: name ?? "Yelp",
          rating, // star rating only
          text:
            reviewCount != null
              ? `Yelp rating summary: ${
                  rating ?? "N/A"
                }★ across ${reviewCount} reviews.`
              : `Yelp rating: ${rating ?? "N/A"}★`,
          url: biz?.url ?? null,
          created_at_ext: new Date().toISOString(),
          raw: { alias, rating, review_count: reviewCount, meta_only: true },
        },
      ];
    } else {
      // Bubble up unexpected errors (429/5xx handled by fetchJson retries)
      throw e;
    }
  }

  // Upsert and trigger pipeline
  const { ids } = await upsertReviews(rows);
  await kickEmbedding(ids);

  // Save cursor/state
  const { cursor } = await getCursor(orgId, "yelp");
  await setCursor(orgId, "yelp", {
    ...cursor,
    last_sync: new Date().toISOString(),
    businessIdOrAlias: alias,
  });

  return {
    fetched: rows.length,
    textReviewsEnabled: rows.length > 0 && !rows[0]?.raw?.meta_only,
    alias,
    rating,
    reviewCount,
  };
}

// // lib/connectors/yelp.ts use only when you get yelp partner access which allows you to get their reviews as they need you to apply for it
// import {
//   fetchJson,
//   upsertReviews,
//   kickEmbedding,
//   getCursor,
//   setCursor,
// } from "./util";

// /**
//  * Optional helper: resolve a Yelp businessId from either phone or name+location.
//  * Use ONE of the inputs.
//  */
// const key = process.env.YELP_API_KEY!;
// if (!key) throw new Error("Missing YELP_API_KEY in server env");
// console.log("YELP_API_KEY length:", process.env.YELP_API_KEY?.length ?? 0);
// export async function resolveYelpBusinessId(opts: {
//   phoneE164?: string; // e.g. "+14155551234"
//   name?: string; // e.g. "Andytown Coffee Roasters"
//   location?: string; // e.g. "San Francisco, CA"
// }): Promise<string | null> {
//   const key = process.env.YELP_API_KEY!;
//   if (!key) throw new Error("Missing YELP_API_KEY");

//   if (opts.phoneE164) {
//     const url = new URL("https://api.yelp.com/v3/businesses/search/phone");
//     url.searchParams.set("phone", opts.phoneE164);
//     const j = await fetchJson(url.toString(), {
//       headers: { Authorization: `Bearer ${key}` },
//     });
//     const id = j?.businesses?.[0]?.id ?? null;
//     return id;
//   }

//   if (opts.name && opts.location) {
//     const url = new URL("https://api.yelp.com/v3/businesses/search");
//     url.searchParams.set("term", opts.name);
//     url.searchParams.set("location", opts.location);
//     url.searchParams.set("limit", "1");
//     const j = await fetchJson(url.toString(), {
//       headers: { Authorization: `Bearer ${key}` },
//     });
//     const id = j?.businesses?.[0]?.id ?? null;
//     return id;
//   }

//   return null;
// }

// /**
//  * Fetch latest Yelp reviews for a business and upsert to `reviews`.
//  * Notes:
//  * - Yelp returns ONLY the 3 most-recent reviews; there is no pagination.
//  * - Treat this as a top-up on each run.
//  */
// export async function syncYelp(orgId: string, businessId: string) {
//   if (!orgId) throw new Error("orgId required");
//   if (!businessId) throw new Error("businessId required");
//   const key = process.env.YELP_API_KEY!;
//   if (!key) throw new Error("Missing YELP_API_KEY");

//   // light cursor (store last sync ISO)
//   const { cursor } = await getCursor(orgId, "yelp");

//   const url = `https://api.yelp.com/v3/businesses/${encodeURIComponent(
//     businessId
//   )}/reviews`;
//   const json = await fetchJson(url, {
//     headers: { Authorization: `Bearer ${key}` },
//   });

//   const reviews = (json?.reviews ?? []) as any[];
//   const rows = reviews.map((r: any) => ({
//     org_id: orgId,
//     source: "yelp" as const,
//     external_id: r.id, // stable unique id from Yelp
//     author: r.user?.name ?? null,
//     rating: typeof r.rating === "number" ? r.rating : null,
//     text: r.text ?? null,
//     url: r.url ?? null,
//     created_at_ext: r.time_created ?? null, // e.g. "2024-10-01 12:34:56"
//     raw: r,
//   }));

//   const { ids } = await upsertReviews(rows);
//   await kickEmbedding(ids);

//   await setCursor(orgId, "yelp", {
//     ...cursor,
//     last_sync: new Date().toISOString(),
//     businessId,
//   });

//   return { fetched: rows.length, businessId };
// }
