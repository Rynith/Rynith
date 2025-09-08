import { contentExternalId, normalize } from "@/lib/hash"

const reviewRows = rows.map((r) => {
  const author = r.author ?? null
  const body = (r.body ?? r.review ?? "").toString()
  const published_at = toISO(r.published_at)
  const external_id =
    (r.external_id && normalize(String(r.external_id))) ||
    contentExternalId(author, body, published_at)

  return {
    org_id, source_id,
    external_id,
    author,
    rating: r.rating != null ? toNumber(r.rating) : null,
    title: r.title ?? null,
    body,
    language: "en",
    published_at,
  }
}).filter(r => r.body && r.body.trim().length > 0)

// use upsert to ignore dupes
await supabase
  .from("reviews")
  .upsert(reviewRows, { onConflict: "org_id,source_id,external_id", ignoreDuplicates: true })