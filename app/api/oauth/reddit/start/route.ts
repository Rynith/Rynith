// app/api/oauth/reddit/start/route.ts
import { NextResponse } from "next/server";
import { randomState } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  if (!orgId) return new NextResponse("orgId required", { status: 400 });

  const clientId = process.env.REDDIT_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/reddit/callback`;
  const state = randomState() + `:${orgId}`;
  const scope = "read history";

  const url = new URL("https://www.reddit.com/api/v1/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("duration", "permanent"); // ensures refresh_token
  url.searchParams.set("scope", scope);

  return NextResponse.redirect(url.toString(), { status: 302 });
}
