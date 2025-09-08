import { contentExternalId } from "@/lib/hash"

const now = new Date().toISOString()

const rows = lines.map((l) => {
  const match = l.match(/^\s*(\d(?:\.\d)?)\s*\|\s*(.+)$/)
  const rating = match ? Number(match[1]) : null
  const body = match ? match[2] : l
  const external_id = contentExternalId(null, body, now)
  return { org_id, source_id, rating: Number.isFinite(rating) ? rating : null, body, language: "en", published_at: now, external_id }
})

await supabase
  .from("reviews")
  .upsert(rows, { onConflict: "org_id,source_id,external_id", ignoreDuplicates: true })
