import { NextResponse } from "next/server";
import { syncRedditForOrg } from "@/lib/connectors/reddit";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const orgId = u.searchParams.get("orgId") || "";
    const subreddit = u.searchParams.get("subreddit") || "smallbusiness";
    const query = u.searchParams.get("query") || undefined;

    if (!orgId)
      return NextResponse.json(
        { ok: false, error: "orgId required" },
        { status: 400 }
      );

    const res = await syncRedditForOrg({ orgId, subreddit, query, limit: 25 });
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "reddit test failed" },
      { status: 500 }
    );
  }
}
