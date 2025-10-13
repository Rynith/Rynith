export type VendorKind = "google" | "yelp" | "reddit";

export type MappedReview = {
  external_id: string; // provider's id
  org_id: string;
  source_id: string;
  rating?: number | null; // 1..5 if available
  author?: string | null;
  text: string;
  url?: string | null;
  published_at?: string | null; // ISO
  raw?: any; // provider payload (jsonb)
};

export type SyncResult = {
  reviews: MappedReview[]; // newly fetched (dedupe comes later)
  nextCursor?: string | null; // vendor pagination cursor
  insertedHint?: number; // optional headcount from provider page
};

export interface Connector {
  kind: VendorKind;
  /**
   * Fetches new reviews from the vendor since `cursor` or `since`.
   * It should NOT write to DB; just return mapped rows + nextCursor.
   */
  sync: (opts: {
    org_id: string;
    source_id: string;
    since?: string | null;
    cursor?: string | null;
    config?: Record<string, any> | null; // from sources.config
    credentials?: Record<string, any> | null; // from source_credentials.data
  }) => Promise<SyncResult>;
}
