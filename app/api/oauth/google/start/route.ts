// app/api/oauth/google/start/route.ts
import { NextResponse } from "next/server";
import { randomState } from "@/lib/oauth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId"); // pass ?orgId=...
  if (!orgId) return new NextResponse("orgId required", { status: 400 });

  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/google/callback`;
  const state = randomState() + `:${orgId}`;

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // ensure refresh_token
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/business.manage"
  );
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString(), { status: 302 });
}
