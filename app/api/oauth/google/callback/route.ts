import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server"; // returns a client instance

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sb = supabaseService();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;



  if (error) return new NextResponse(`Google error: ${error}`, { status: 400 });
  if (!code || !state)
    return new NextResponse("Missing code/state", { status: 400 });

  const [, orgId] = state.split(":");

  // --- exchange code for tokens ---
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: `${base}/api/oauth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok)
    return new NextResponse("Token exchange failed", { status: 400 });

  const tokens = await tokenRes.json();

  // --- save credentials ---
  const { error: upErr } = await sb.from("source_credentials").upsert(
    {
      org_id: orgId,
      source: "google_gbp",
      credentials: tokens,
      cursor: {}, // first-time empty cursor
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,source" }
  );

  if (upErr) {
    return new NextResponse(`DB upsert error: ${upErr.message}`, {
      status: 500,
    });
  }

  return new NextResponse(
    `<html><body>Google connected. You can close this window.</body></html>`,
    { headers: { "content-type": "text/html" } }
  );
}
