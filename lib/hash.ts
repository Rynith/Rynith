// /lib/hash.ts
import { createHash } from "crypto"

// normalize to reduce accidental diffs (whitespace, case, unicode)
export function normalize(s?: string | null) {
  return (s ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

export function contentExternalId(author?: string | null, body?: string | null, published_at?: string | null) {
  const a = normalize(author)
  const b = normalize(body)
  const p = published_at ? new Date(published_at).toISOString().slice(0, 19) : "" // second precision
  const raw = `${a}|${b}|${p}`
  return createHash("sha256").update(raw).digest("hex")
}
