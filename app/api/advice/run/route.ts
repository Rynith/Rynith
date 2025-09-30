// app/api/advice/run/route.ts
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Role = "owner" | "admin" | "member";

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function dayUTC(d = new Date()) {
  const day = d.toISOString().slice(0, 10);
  return { day, start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z` };
}
function sevenDaysAgoISO() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}
function stripCodeFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
}

type ReviewWithAnalysis = {
  id: string;
  org_id: string;
  author: string | null;
  rating: number | null;
  body: string | null;
  created_at: string | null;
  published_at: string | null;
  review_analysis: { sentiment: number | null; topics: string[] | null } | null;
};

export async function POST(req: Request) {
  // Internal auth
  const keyProvided = (req.headers.get("x-internal-key") || "").trim();
  if (
    !process.env.INTERNAL_SYNC_KEY ||
    keyProvided !== process.env.INTERNAL_SYNC_KEY
  ) {
    return j(401, { error: "Unauthorized" });
  }

  // lazy-import OpenAI to avoid bundler resolution hiccups
  let OpenAI: any;
  if (process.env.OPENAI_API_KEY) {
    try {
      OpenAI = (await import("openai")).default;
    } catch {
      // if the package truly isn't installed, we'll operate in heuristic mode below
      OpenAI = null;
    }
  }

  const sb = supabaseAdmin();
  const { day } = dayUTC();
  const since = sevenDaysAgoISO();

  // Optional: target a single org in testing via ?org_id=...
  const url = new URL(req.url);
  const onlyOrg = (url.searchParams.get("org_id") || "").trim();

  // 1) Pull org_ids with reviews in the last 7 days (then distinct in JS)
  const revRes = await sb
    .from("reviews")
    .select("org_id")
    .gte("created_at", since)
    .limit(10000);

  if (revRes.error) return j(500, { error: revRes.error.message });

  let orgIds = Array.from(
    new Set((revRes.data ?? []).map((r: any) => r.org_id))
  ).filter((v): v is string => Boolean(v));
  if (onlyOrg) orgIds = orgIds.filter((id) => id === onlyOrg);
  if (orgIds.length === 0) return j(200, { ok: true, written: 0, day });

  let totalWritten = 0;

  for (const org_id of orgIds) {
    // 2) Pull compact context: last 7 days reviews + analysis for this org
    const rowsRes = await sb
      .from("reviews")
      .select(
        "id, org_id, author, rating, body, created_at, published_at, review_analysis(sentiment,topics)"
      )
      .eq("org_id", org_id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    if (rowsRes.error || !rowsRes.data?.length) continue;
    const rows = rowsRes.data as unknown as ReviewWithAnalysis[];

    // Split pos/neg and build topic counts
    const negatives: ReviewWithAnalysis[] = [];
    const positives: ReviewWithAnalysis[] = [];
    const topicBag: Record<string, number> = {};

    for (const r of rows) {
      const s = r.review_analysis?.sentiment ?? 0;
      const topics = r.review_analysis?.topics ?? [];
      topics.forEach((t) => {
        if (!t) return;
        topicBag[t] = (topicBag[t] || 0) + 1;
      });
      if (s <= -0.15) negatives.push(r);
      else if (s >= 0.15) positives.push(r);
    }

    const topTopics = Object.entries(topicBag)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([t, c]) => ({ topic: t, mentions: c }));

    const sample = (arr: ReviewWithAnalysis[], n: number) =>
      arr.slice(0, n).map((r) => ({
        rating: r.rating,
        sentiment: r.review_analysis?.sentiment ?? null,
        topics: r.review_analysis?.topics ?? [],
        body: (r.body || "").slice(0, 400),
        when: r.published_at || r.created_at,
      }));

    const context = {
      window_days: 7,
      counts: {
        total: rows.length,
        positive: positives.length,
        negative: negatives.length,
      },
      top_topics: topTopics,
      samples: {
        negatives: sample(negatives, 6),
        positives: sample(positives, 6),
      },
    };

    // 3) Get AI suggestions (or heuristics fallback if no key)
    let mitigation: Array<{
      title: string;
      body: string;
      topic?: string;
      confidence?: number;
    }> = [];
    let growth: Array<{
      title: string;
      body: string;
      topic?: string;
      confidence?: number;
    }> = [];

    if (OpenAI && process.env.OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const system =
          "You are a senior retail CX operator. Propose precise, low-effort, high-impact actions. Be concrete, reference customer language, and keep each suggestion short and actionable.";
        const user = `
Return ONLY JSON matching this TypeScript type (no prose, no backticks):

{
  "mitigation": Array<{ "title": string; "body": string; "topic"?: string; "confidence"?: number }>,
  "growth": Array<{ "title": string; "body": string; "topic"?: string; "confidence"?: number }>
}

Context:
${JSON.stringify(context)}
`.trim();

        const resp = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.3,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        });
        const text = stripCodeFences(
          resp.choices?.[0]?.message?.content || "{}"
        );
        const parsed = JSON.parse(text);
        mitigation = Array.isArray(parsed?.mitigation) ? parsed.mitigation : [];
        growth = Array.isArray(parsed?.growth) ? parsed.growth : [];
      } catch (e: any) {
        // fall back to heuristics if model call fails
        mitigation = [];
        growth = [];
      }
    }

    if (!mitigation.length && !growth.length) {
      // Heuristic fallback so the feature still works without an API key
      // Mitigation: top negative topic
      const negTopic = Object.entries(topicBag)
        .filter(([t]) => t)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      if (negTopic) {
        mitigation.push({
          title: `Reduce ${negTopic} complaints`,
          body: "Create a 2-step SOP to resolve this issue at first contact. Monitor mentions daily for 1 week and reply to all negative reviews that reference it.",
          topic: negTopic,
          confidence: 0.5,
        });
      }
      // Growth: top positive topic inferred from positives’ topics
      const posTopicBag: Record<string, number> = {};
      positives.forEach((r) =>
        (r.review_analysis?.topics ?? []).forEach(
          (t) => (posTopicBag[t] = (posTopicBag[t] || 0) + 1)
        )
      );
      const posTop = Object.entries(posTopicBag).sort(
        (a, b) => b[1] - a[1]
      )[0]?.[0];
      if (posTop) {
        growth.push({
          title: `Double-down on ${posTop}`,
          body: "Feature this strength in your homepage hero and social posts. Ask satisfied customers to mention it in public reviews.",
          topic: posTop,
          confidence: 0.5,
        });
      }
    }

    // 4) Upsert advice
    type UpRow = {
      org_id: string;
      day: string;
      type: "mitigation" | "growth";
      title: string;
      body: string;
      topic?: string | null;
      confidence?: number | null;
    };
    const rowsToInsert: UpRow[] = [];

    for (const s of mitigation.slice(0, 5)) {
      if (!s?.title || !s?.body) continue;
      rowsToInsert.push({
        org_id,
        day,
        type: "mitigation",
        title: String(s.title).slice(0, 140),
        body: String(s.body).slice(0, 800),
        topic: s.topic ? String(s.topic).slice(0, 60) : null,
        confidence:
          typeof s.confidence === "number"
            ? Math.max(0, Math.min(1, s.confidence))
            : null,
      });
    }
    for (const s of growth.slice(0, 5)) {
      if (!s?.title || !s?.body) continue;
      rowsToInsert.push({
        org_id,
        day,
        type: "growth",
        title: String(s.title).slice(0, 140),
        body: String(s.body).slice(0, 800),
        topic: s.topic ? String(s.topic).slice(0, 60) : null,
        confidence:
          typeof s.confidence === "number"
            ? Math.max(0, Math.min(1, s.confidence))
            : null,
      });
    }

    if (rowsToInsert.length) {
      const up = await sb
        .from("ai_advice")
        .upsert(rowsToInsert, {
          onConflict: "org_id,day,type,title",
          ignoreDuplicates: true,
        });
      if (!up.error) totalWritten += rowsToInsert.length;
    }
  }

  return j(200, { ok: true, written: totalWritten, day });
}
