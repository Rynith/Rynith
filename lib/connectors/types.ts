// /lib/connectors/types.ts
export type SyncResult = { inserted: number; nextCursor?: string | null }

export interface Connector {
  readonly kind: "google" | "yelp" | "twitter" | "email" | "csv" | "manual"
  connect?: (opts: { sourceId: string }) => Promise<void> // optional
  sync: (opts: { sourceId: string; since?: string | null }) => Promise<SyncResult>
  webhook?: (payload: any) => Promise<void> // optional
}
