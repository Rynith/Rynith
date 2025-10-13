import type { Connector, SyncResult, MappedReview } from "./types";

/**
 * Two modes:
 *  - App credentials (recommended): REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET
 *    sources.config = { subreddit: "yoursub", query?: "brand OR product" }
 *  - Public JSON (basic): sources.config = { subreddit: "yoursub" } (no search; pulls hot/new)
 */
async function redditToken() {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET)
    return null;
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization:
        "Basic " +
        Buffer.from(
          `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
        ).toString("base64"),
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      device_id: "DO_NOT_TRACK_THIS_DEVICE",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}

export const redditConnector: Connector = {
  kind: "reddit",
  async sync({
    org_id,
    source_id,
    cursor,
    since,
    config,
  }): Promise<SyncResult> {
    const subreddit = String(config?.subreddit || "")
      .replace(/^r\//, "")
      .trim();
    if (!subreddit) return { reviews: [], nextCursor: null };

    const query = String(config?.query || "").trim() || null;
    const auth = await redditToken();

    let url: string;
    if (auth && query) {
      const params = new URLSearchParams({
        q: `subreddit:${subreddit} ${query}`,
        sort: "new",
        limit: "50",
        ...(cursor ? { after: cursor } : {}),
      });
      url = `https://oauth.reddit.com/search?${params.toString()}`;
    } else {
      // public JSON
      const params = new URLSearchParams({
        limit: "25",
        ...(cursor ? { after: cursor } : {}),
      });
      url = `https://www.reddit.com/r/${encodeURIComponent(
        subreddit
      )}/new.json?${params.toString()}`;
    }

    const res = await fetch(url, {
      headers: auth
        ? {
            authorization: `Bearer ${auth.access_token}`,
            "user-agent": "rynith-bot/1.0",
          }
        : { "user-agent": "rynith-bot/1.0" },
    });
    if (!res.ok) throw new Error(`reddit fetch failed: ${res.status}`);
    const json = await res.json();

    const posts = json?.data?.children ?? [];
    const nextCursor = json?.data?.after ?? null;

    const rows: MappedReview[] = posts.map((p: any) => {
      const d = p.data || {};
      const body = d.selftext || d.title || "";
      return {
        external_id: String(d.id),
        org_id,
        source_id,
        rating: null, // reddit has no star rating
        author: d.author || null,
        text: body,
        url: d.permalink ? `https://reddit.com${d.permalink}` : null,
        published_at: d.created_utc
          ? new Date(d.created_utc * 1000).toISOString()
          : null,
        raw: d,
      };
    });

    // Optional crude 'since' filter by time if provided
    const filtered = since
      ? rows.filter(
          (r) => !r.published_at || new Date(r.published_at) >= new Date(since)
        )
      : rows;

    return { reviews: filtered, nextCursor };
  },
};
