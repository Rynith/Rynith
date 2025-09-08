// app/api/analyze/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

// === MVP heuristics (replace with your real model later) ===
function scoreFromText(text: string): number | null {
  const t = (text || "").toLowerCase();
  const pos = ["great","excellent","amazing","love","fast","friendly","clean","perfect","happy","recommend"];
  const neg = ["bad","poor","terrible","hate","slow","rude","dirty","broken","unhappy","refund","late","delay"];
  let s = 0; pos.forEach(w => { if (t.includes(w)) s += 1 }); neg.forEach(w => { if (t.includes(w)) s -= 1 });
  if (s === 0) return null; return Math.max(-1, Math.min(1, s / 5));
}
function topicsFromText(text: string): string[] {
  const t = (text || "").toLowerCase(); const topics = new Set<string>();
  if (/(ship|deliver|courier|arrival|late)/.test(t)) topics.add("shipping");
  if (/(return|refund|exchange)/.test(t)) topics.add("returns");
  if (/(size|fit|small|large)/.test(t)) topics.add("sizing");
  if (/(price|expensive|cheap|value)/.test(t)) topics.add("pricing");
  if (/(staff|service|support|rude|helpful)/.test(t)) topics.add("service");
  if (/(quality|material|broke|defect)/.test(t)) topics.add("quality");
  if (/(wait|queue|delay)/.test(t)) topics.add("wait_time");
  return Array.from(topics).slice(0, 5);
}

export async function POST() {
  const supabase = supabaseServer();

  // 1) Current user -> org
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: mem, error: memErr } = await supabase
    .from("org_members").select("org_id").eq("user_id", user.id).single();
  if (memErr || !mem?.org_id) return NextResponse.json({ error: "No org" }, { status: 400 });
  const org_id = mem.org_id as string;

  // 2) Only unanalyzed reviews (LEFT JOIN filter)
  const { data: toAnalyze, error: qErr } = await supabase
    .from("reviews")
    .select("id, rating, body, published_at, review_analysis!left(review_id)")
    .eq("org_id", org_id)
    .not("body", "is", null)
    .not("body", "eq", "")
    .is("review_analysis.review_id", null)
    .order("published_at", { ascending: false })
    .limit(1000);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  // 3) Build analysis rows
  const rows = (toAnalyze ?? []).map(r => {
    const fromRating = typeof r.rating === "number" && Number.isFinite(r.rating)
      ? (Math.max(1, Math.min(5, Number(r.rating))) - 3) / 2 // 1..5 -> -1..1
      : null;
    const fromText = scoreFromText(r.body || "");
    const sentiment = fromRating ?? fromText ?? 0;
    const topics = topicsFromText(r.body || "");
    const summary = (r.body || "").slice(0, 140);
    return { review_id: r.id, sentiment, summary, topics, entities: {} };
  });

  // 4) Upsert analyses (idempotent)
  if (rows.length) {
    const { error: upErr } = await supabase.from("review_analysis").upsert(rows);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  // 5) Recompute last 30 days rollups
  const { error: dErr } = await supabase.rpc("compute_insight_daily", { p_org_id: org_id });
  if (dErr) {
    // Inline fallback if RPC not present
    const since = new Date(Date.now() - 30*24*60*60*1000).toISOString();

    const { data: revs, error: rErr } = await supabase
      .from("reviews").select("id, rating, published_at")
      .eq("org_id", org_id).gte("published_at", since);
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    const { data: ar } = await supabase
      .from("review_analysis").select("review_id, sentiment, topics")
      .in("review_id", (revs ?? []).map(a => a.id));

    const byDay = new Map<string, { c: number; ratings: number[]; sents: number[]; topics: string[] }>();
    for (const r of revs ?? []) {
      const day = (r.published_at ?? new Date().toISOString()).slice(0, 10);
      const b = byDay.get(day) ?? { c: 0, ratings: [], sents: [], topics: [] }; b.c++;
      if (typeof r.rating === "number") b.ratings.push(r.rating);
      const a = ar?.find(x => x.review_id === r.id);
      if (a?.sentiment != null) b.sents.push(a.sentiment);
      if (a?.topics?.length) b.topics.push(...a.topics);
      byDay.set(day, b);
    }
    const avg = (arr: number[]) => arr.length ? arr.reduce((x,y)=>x+y,0)/arr.length : null;
    const upserts = Array.from(byDay.entries()).map(([day, b]) => {
      const tc = b.topics.reduce<Record<string, number>>((m,t)=>((m[t]=(m[t]||0)+1),m),{});
      const top = Object.entries(tc).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([t])=>t);
      return { org_id, day, review_count: b.c, avg_rating: avg(b.ratings), avg_sentiment: avg(b.sents), top_topics: top };
    });
    if (upserts.length) {
      const { error: iuErr } = await supabase.from("insight_daily").upsert(upserts, { onConflict: "org_id,day" });
      if (iuErr) return NextResponse.json({ error: iuErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, analyzed: rows.length });
}
