import { getAppToken } from "./reddit-auth";
import {
  fetchJson,
  embedNewReviews,
  analyzeNewReviews,
} from "@/lib/connectors/util";
import { upsertReviews } from "@/lib/reviews-ingest";
import { supabaseService } from "@/lib/supabase-server";
import { redditRateLimit } from "@/lib/rate-limits";

export async function syncRedditForOrg(params: {
  orgId: string;
  subreddit?: string;
  query?: string;
  limit?: number;
}) {
  const { orgId, subreddit, query, limit = 50 } = params;

  // rate limit per org
  const rl = redditRateLimit(orgId);
  if (!rl.allowed) throw new Error("Too many Reddit syncs right now");

  // Supabase client
  const supa = supabaseService();

  // load last cursor
  const { data: credRow } = await supa
    .from("source_credentials")
    .select("cursor")
    .eq("org_id", orgId)
    .eq("source", "reddit")
    .maybeSingle();

  const after = (credRow?.cursor as { after?: string } | null)?.after;

  const token = await getAppToken();
  const ua = process.env.REDDIT_USER_AGENT!;

  // build listing URL
  const base = query
    ? `https://oauth.reddit.com/r/${subreddit || "all"}/search?restrict_sr=${
        subreddit ? "1" : "0"
      }&q=${encodeURIComponent(query)}&sort=new&type=link`
    : `https://oauth.reddit.com/r/${subreddit || "all"}/new`;

  const url = new URL(base);
  url.searchParams.set("limit", String(limit));
  if (after) url.searchParams.set("after", after);

  const listing = await fetchJson(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": ua },
  });

  const posts: any[] = listing?.data?.children?.map((c: any) => c.data) ?? [];
  const nextAfter: string | undefined = listing?.data?.after ?? undefined;

  // fetch a few comments for each post (lightweight)
  const commentsByPost: Record<string, any[]> = {};
  for (const p of posts.slice(0, 10)) {
    const permalink = p.permalink as string;
    const commentsUrl = `https://oauth.reddit.com${permalink}.json?limit=10`;
    try {
      const thread = await fetchJson(commentsUrl, {
        headers: { Authorization: `Bearer ${token}`, "User-Agent": ua },
      });
      const comments =
        thread?.[1]?.data?.children
          ?.map((c: any) => c?.data)
          ?.filter((d: any) => d?.body) ?? [];
      commentsByPost[p.id] = comments;
    } catch {
      commentsByPost[p.id] = [];
    }
  }

  // map to review rows
  const mapped: {
    org_id: string;
    source: "reddit";
    external_id: string;
    author: string | null;
    body: string;
    rating: number | null;
    published_at: string | null;
    url: string | null;
  }[] = [];

  for (const p of posts) {
    const body = [p.title, p.selftext].filter(Boolean).join("\n\n");
    if (body.trim()) {
      mapped.push({
        org_id: orgId,
        source: "reddit",
        external_id: `post_${p.id}`,
        author: p.author || null,
        body,
        rating: null,
        published_at: p.created_utc
          ? new Date(p.created_utc * 1000).toISOString()
          : null,
        url: p.url || `https://reddit.com${p.permalink}` || null,
      });
    }
    for (const c of commentsByPost[p.id] || []) {
      if (!c?.body) continue;
      mapped.push({
        org_id: orgId,
        source: "reddit",
        external_id: `comment_${c.id}`,
        author: c.author || null,
        body: c.body,
        rating: null,
        published_at: c.created_utc
          ? new Date(c.created_utc * 1000).toISOString()
          : null,
        url: `https://reddit.com${c.permalink}` || null,
      });
    }
  }

  // upsert → get ids → embed → analyze
  const ids = await upsertReviews(
    mapped.map((m) => ({
      org_id: m.org_id,
      source: "reddit",
      external_id: m.external_id,
      author: m.author,
      body: m.body,
      rating: m.rating,
      published_at: m.published_at,
    }))
  );

  let embedded = 0,
    analyzed = 0;
  if (ids.length) {
    const { data: rows, error } = await supa
      .from("reviews")
      .select("id, org_id, body")
      .in("id", ids);
    if (!error && rows?.length) {
      embedded = await embedNewReviews(rows);
      analyzed = await analyzeNewReviews(rows);
    }
  }

  // save cursor (non-blocking)
  try {
    await supa.from("source_credentials").upsert(
      {
        org_id: orgId,
        source: "reddit",
        credentials: {},
        cursor: {
          after: nextAfter || null,
          lastChecked: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "org_id,source" } as any
    );
  } catch (e) {
    console.warn("reddit cursor upsert failed:", e);
  }

  return {
    inserted: ids.length,
    embedded,
    analyzed,
    nextAfter: nextAfter || null,
  };
}
