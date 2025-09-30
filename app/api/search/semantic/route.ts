// app/api/search/semantic/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { embedText } from "@/lib/ai"; // you already have this

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  // Auth (cookie-bound anon client)
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  if (!auth?.user) return j(401, { error: "Unauthorized" });

  // Parse
  let body: { query?: string; limit?: number } = {};
  try {
    body = await req.json();
  } catch {}
  const query = (body.query || "").trim();
  const limit = Math.min(Math.max(body.limit ?? 10, 1), 50);
  if (!query) return j(400, { error: "query is required" });

  // Find caller's org (latest membership)
  const { data: memRows, error: memErr } = await supa
    .from("org_members")
    .select("org_id")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  if (memErr) return j(400, { error: memErr.message });

  const org_id = memRows?.[0]?.org_id as string | undefined;
  if (!org_id) return j(400, { error: "No org" });

  // Embed the query
  let vec: number[];
  try {
    vec = await embedText(query);
  } catch (e: any) {
    return j(500, { error: "Embedding failed" });
  }

  // Call RPC (RLS will still apply)
  const { data, error } = await supa.rpc("match_reviews_semantic", {
    p_org_id: org_id,
    p_query: vec as unknown as any, // PostgREST accepts float[] for vector
    p_limit: limit,
  });

  if (error) return j(400, { error: error.message });

  return j(200, { ok: true, results: data ?? [] });
}