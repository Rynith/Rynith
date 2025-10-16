// app/api/oauth/reddit/callback/route.ts
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-server";

function encodeBasic(id: string, secret: string) {
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export const runtime = "nodejs";

export async function GET(req: Request) {
  const sb = supabaseService();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");

  if (err) return new NextResponse(`Reddit error: ${err}`, { status: 400 });
  if (!code || !state)
    return new NextResponse("Missing code/state", { status: 400 });

  const [, orgId] = state.split(":");

  // 1) Exchange code → tokens
  const tokenRes = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${encodeBasic(
        process.env.REDDIT_CLIENT_ID!,
        process.env.REDDIT_CLIENT_SECRET!
      )}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/reddit/callback`,
    }),
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text().catch(() => "");
    return new NextResponse(`Token exchange failed: ${t}`, { status: 400 });
  }
  const tokens = await tokenRes.json(); // { access_token, refresh_token, ... }

  // 2) Upsert into source_credentials (Option B schema)
  const { error: upErr } = await sb.from("source_credentials").upsert(
    {
      org_id: orgId,
      source: "reddit",
      credentials: tokens,
      cursor: {}, // e.g. { after: null, last_sync: <iso> }
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
    `<html><body>Reddit connected. You can close this window.</body></html>`,
    { headers: { "content-type": "text/html" } }
  );
}
