// app/api/internal/sync/route.ts
import { NextResponse } from "next/server";
import { syncGBP } from "@/lib/connectors/google-gbp";
import { syncPlaces } from "@/lib/connectors/google-places";
import { syncYelp } from "@/lib/connectors/yelp";
import { syncRedditForOrg } from "@/lib/connectors/reddit";

export const runtime = "nodejs";

function assertKey(req: Request) {
  const provided = req.headers.get("x-internal-key") || "";
  const expected = process.env.INTERNAL_SYNC_KEY || "";
  if (!expected) {
    throw new Error("Server missing INTERNAL_SYNC_KEY");
  }
  if (provided !== expected) {
    throw new Error("Unauthorized: bad x-internal-key");
  }
}


export async function POST(req: Request) {
  try {
    assertKey(req);
    const _body = await req.json().catch(() => ({}));
    const orgId: string = _body.orgId;
    const sources: string[] = Array.isArray(_body.sources) ? _body.sources : [];
    const args: any = _body.args ?? {};

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: "Missing orgId" },
        { status: 400 }
      );
    }
    if (!sources.length) {
      return NextResponse.json(
        { ok: false, error: "Provide sources: string[]" },
        { status: 400 }
      );
    }

    const results: Record<string, any> = {};

    for (const s of sources) {
      try {
        if (s === "google_gbp") {
          results.google_gbp = await syncGBP(orgId, args.google?.locationName);
        } else if (s === "google_places") {
          results.google_places = await syncPlaces(orgId, args.google?.placeId);
        } else if (s === "yelp") {
          results.yelp = await syncYelp(orgId, args.yelp?.businessId);
        } else if (s === "reddit") {
          // ✅ correct call signature: single object
          results.reddit = await syncRedditForOrg({
            orgId,
            subreddit: args.reddit?.subreddit || "all",
            query: args.reddit?.query || undefined,
            limit: Number(args.reddit?.limit) || 50,
          });
        } else {
          results[s] = { ok: false, error: "Unknown source" };
        }
      } catch (e: any) {
        results[s] = { ok: false, error: e?.message || String(e) };
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}