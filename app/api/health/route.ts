// app/api/health/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs"; // supabase libs aren't edge-safe

function has(key: string) {
  const v = process.env[key];
  return !!(v && v.trim().length > 0);
}

export async function GET() {
  const started = Date.now();

  // Check key presence (no external calls)
  const env = {
    OPENAI_API_KEY: has("OPENAI_API_KEY"),
    OPENAI_EMBED_MODEL:
      process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small",
    INTERNAL_SYNC_KEY: has("INTERNAL_SYNC_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: has("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    VERCEL_URL: process.env.VERCEL_URL || null,
  };

  // Try a cheap DB ping via Supabase
  let supabase = { connected: false as boolean, now: null as string | null };
  try {
    const sb = await supabaseServer();
    const { data, error } = await sb.rpc("now"); // If you don't have rpc(now), fallback to select
    if (!error && data) {
      supabase = { connected: true, now: String(data) };
    } else {
      // Fallback probe: select now() via built-in function if RPC isn't defined
      const { data: t, error: e2 } = await sb
        .from("_dummy")
        .select("id")
        .limit(1);
      // We don't care about table contents; just catching connectivity errors.
      if (!e2) supabase.connected = true;
    }
  } catch {
    supabase.connected = false;
  }

  const payload = {
    ok:
      env.OPENAI_API_KEY &&
      !!env.NEXT_PUBLIC_SUPABASE_URL &&
      supabase.connected,
    env,
    supabase,
    meta: {
      runtime: process.env.VERCEL ? "vercel" : "local",
      region: process.env.VERCEL_REGION || null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || null,
      ms: Date.now() - started,
    },
  };

  return NextResponse.json(payload, { status: payload.ok ? 200 : 500 });
}

// Optional: make POST behave the same so you can curl -X POST if you like
export async function POST() {
  return GET();
}
