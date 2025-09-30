// app/api/alerts/run/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseService as supabaseAdmin } from "@/lib/supabase-server"; // service-role client (bypasses RLS)
import { isOrgPro } from "@/lib/billing";

/* -------------------- tiny utils -------------------- */
function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
function todayUTC() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  return { day, start: `${day}T00:00:00.000Z`, end: `${day}T23:59:59.999Z` };
}
function ymdUTC(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
}
function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((s, x) => s + (x - m) * (x - m), 0) / (xs.length - 1);
  return Math.sqrt(Math.max(0, v));
}

/* -------------------- email helpers you already had -------------------- */
function htmlEscape(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
}
async function sendEmailResend(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY || "";
  const from = process.env.EMAIL_FROM || "Rynith <no-reply@notifications.rynith.com>";
  if (!key) {
    console.log(`[digest][dev] Would send to ${to}: ${subject}`);
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      console.warn(
        "[digest][email] Resend error:",
        res.status,
        await res.text().catch(() => "")
      );
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[digest][email] Network error:", (e as Error)?.message || e);
    return false;
  }
}
function renderWeeklyDigestHtml(args: {
  orgName: string | null;
  days: number;
  totals: { reviews: number; avgRating: number | null; avgSent: number | null };
  topTopics: string[];
  topReviews: Array<{
    published_at: string | null;
    author: string | null;
    rating: number | null;
    sentiment: number | null;
    summary: string | null;
    body: string | null;
    topics: string[] | null;
  }>;
}) {
  const title = args.orgName
    ? `Weekly Digest — ${htmlEscape(args.orgName)}`
    : "Weekly Digest";
  const metric = (label: string, val: string) =>
    `<div style="padding:8px 12px;border:1px solid #eee;border-radius:8px;margin-right:8px">
       <div style="font-size:12px;color:#666">${label}</div>
       <div style="font-weight:700;color:#111">${val}</div>
     </div>`;
  const topicChips = args.topTopics
    .map(
      (t) =>
        `<span style="display:inline-block;padding:4px 8px;border:1px solid #eee;border-radius:999px;margin:4px 6px 0 0;font-size:12px;color:#333;background:#fafafa">${htmlEscape(
          t
        )}</span>`
    )
    .join("");
  const reviews = args.topReviews
    .map((r) => {
      const when = r.published_at
        ? new Date(r.published_at).toISOString().slice(0, 10)
        : "—";
      const line =
        r.summary ||
        (r.body || "").slice(0, 200) + ((r.body || "").length > 200 ? "…" : "");
      const topics = (r.topics || [])
        .map(
          (t) =>
            `<code style="background:#f5f5ff;border:1px solid #eee;padding:2px 6px;border-radius:6px">${htmlEscape(
              t
            )}</code>`
        )
        .join(" ");
      return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #eee">
          <div style="font-size:12px;color:#666">${when} • ${htmlEscape(
        r.author || "Anonymous"
      )}</div>
          <div style="margin:6px 0 2px 0;color:#111">${htmlEscape(line)}</div>
          <div style="font-size:12px;color:#666">
            ${r.rating != null ? `★ ${r.rating} ` : ""}${
        r.sentiment != null ? `• Sent ${r.sentiment}` : ""
      }
          </div>
          ${topics ? `<div style="margin-top:4px">${topics}</div>` : ""}
        </td>
      </tr>`;
    })
    .join("");
  return `
  <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:680px;margin:0 auto;padding:16px">
    <h2 style="margin:0 0 8px 0;color:#111">${title}</h2>
    <div style="color:#666;margin-bottom:12px">Past ${args.days} days</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px 0">
      ${metric("Total Reviews", String(args.totals.reviews))}
      ${metric(
        "Avg Rating",
        args.totals.avgRating != null ? String(args.totals.avgRating) : "—"
      )}
      ${metric(
        "Avg Sentiment",
        args.totals.avgSent != null ? String(args.totals.avgSent) : "—"
      )}
    </div>
    <h3 style="margin:16px 0 8px 0;color:#111">Top Topics</h3>
    <div>${topicChips || `<span style="color:#999">No topics yet</span>`}</div>
    <h3 style="margin:16px 0 8px 0;color:#111">Most Negative Reviews (Top 5)</h3>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${
        reviews ||
        `<tr><td style="color:#999">No reviews in this period</td></tr>`
      }
    </table>
    <p style="color:#666;font-size:12px;margin-top:18px">You’re receiving this weekly digest from Rynith.</p>
  </div>`;
}

/* -------------------- MAIN -------------------- */
export async function POST(req: Request) {
  // Internal auth
  const provided = (req.headers.get("x-internal-key") ?? "").trim();
  const expected = process.env.INTERNAL_SYNC_KEY;
  if (!expected)
    return j(500, {
      error: "Server misconfigured: INTERNAL_SYNC_KEY is not set",
    });
  if (provided !== expected) return j(401, { error: "Unauthorized" });

  const sb = supabaseAdmin();

  const today = ymdUTC();
  const from28 = ymdUTC(new Date(Date.now() - 28 * 24 * 60 * 60 * 1000));
  const yesterday = ymdUTC(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000));
  const topicsFn = process.env.TOPICS_FN || "get_topic_counts_jsonb"; // set via env

  // Orgs with activity in last 28 days
  const { data: orgRows, error: orgErr } = await sb
    .from("insight_daily")
    .select("org_id")
    .gte("day", from28)
    .lte("day", today);
  if (orgErr) return j(500, { error: orgErr.message });
  const orgIds = Array.from(
    new Set((orgRows ?? []).map((r) => r.org_id))
  ).filter(Boolean) as string[];

  let updatedBaselines = 0;
  const alertsToInsert: Array<{
    org_id: string;
    day: string;
    kind: string;
    message: string;
    severity: "info" | "warning" | "critical";
    metadata: any;
  }> = [];

  for (const org_id of orgIds) {
    /* ---------- Sentiment baseline (last 28d, exclude today) ---------- */
    const { data: daily, error: dErr } = await sb
      .from("insight_daily")
      .select("day, review_count, avg_sentiment")
      .eq("org_id", org_id)
      .gte("day", from28)
      .lte("day", yesterday)
      .order("day", { ascending: true });
    if (dErr) continue;

    const validDays = (daily ?? []).filter(
      (d) => (d.review_count ?? 0) >= 3 && typeof d.avg_sentiment === "number"
    );
    const sentSeries = validDays.map((d) => Number(d.avg_sentiment));
    const sentMean = sentSeries.length ? mean(sentSeries) : 0;
    const sentStd = sentSeries.length ? stdev(sentSeries) : 0;

    // upsert baseline
    {
      const { error: upErr } = await sb.from("org_thresholds").upsert({
        org_id,
        metric: "sentiment_avg",
        mean: sentMean,
        stdev: sentStd,
        sample_n: sentSeries.length,
        updated_at: new Date().toISOString(),
      });
      if (!upErr) updatedBaselines++;
    }

    // today z-score for sentiment
    const { data: todayRow } = await sb
      .from("insight_daily")
      .select("review_count, avg_sentiment")
      .eq("org_id", org_id)
      .eq("day", today)
      .maybeSingle();

    if (
      todayRow?.avg_sentiment != null &&
      (todayRow.review_count ?? 0) >= 3 &&
      sentSeries.length >= 7 &&
      sentStd > 0
    ) {
      const z = (Number(todayRow.avg_sentiment) - sentMean) / sentStd;
      if (z <= -2.0) {
        alertsToInsert.push({
          org_id,
          day: today,
          kind: "sentiment_drop_z",
          message: `Sentiment drop: z=${z.toFixed(2)} (today ${Number(
            todayRow.avg_sentiment
          ).toFixed(2)} vs μ=${sentMean.toFixed(2)}, σ=${sentStd.toFixed(2)}; ${
            todayRow.review_count
          } reviews).`,
          severity: "warning",
          metadata: {
            z,
            mean: sentMean,
            stdev: sentStd,
            review_count: todayRow.review_count,
          },
        });
      }
    }

    /* ---------- Topic spike (per-topic z score) ---------- */
    type TopicCountRow = { day: string; topic: string; cnt: number };

    // today counts
    const { data: todayTopicsRaw } = await sb.rpc(topicsFn, {
      p_org_id: org_id,
      p_from: today,
      p_to: today,
    });
    const todayTopics = (todayTopicsRaw ?? []) as TopicCountRow[];

    // Build a map topic -> count (safe loop, no generics)
    const todayCounts: Record<string, number> = {};
    for (const r of todayTopics) {
      const t = (r.topic ?? "").trim();
      if (!t) continue;
      const n = Number(r.cnt ?? 0);
      if (!Number.isFinite(n)) continue;
      todayCounts[t] = (todayCounts[t] ?? 0) + n;
    }

    // Top few [topic, count]
    const todaysTopTopics: Array<[string, number]> = Object.entries(todayCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // history counts (last 28d excluding today)
    const { data: histRaw } = await sb.rpc(topicsFn, {
      p_org_id: org_id,
      p_from: from28,
      p_to: yesterday,
    });
    const hist = (histRaw ?? []) as TopicCountRow[];

    // pre-index by topic -> day -> count
    const perTopic: Record<string, Record<string, number>> = {};
    for (const r of hist) {
      const t = String(r.topic);
      if (!perTopic[t]) perTopic[t] = {};
      perTopic[t][String(r.day)] = Number(r.cnt ?? 0);
    }

    // 28-day list (excluding today)
    const days: string[] = [];
    for (let i = 28; i >= 1; i--) {
      days.push(ymdUTC(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
    }

    for (const [topic, todayCntRaw] of todaysTopTopics) {
      const todayCnt = Number(todayCntRaw);
      const series = days.map((d) => perTopic[topic]?.[d] ?? 0);
      const m = series.length ? mean(series) : 0;
      const s = series.length ? stdev(series) : 0;

      // upsert per-topic baseline
      {
        const { error: upErr } = await sb.from("org_thresholds").upsert({
          org_id,
          metric: `topic:${topic}`,
          mean: m,
          stdev: s,
          sample_n: series.length,
          updated_at: new Date().toISOString(),
        });
        if (!upErr) updatedBaselines++;
      }

      if (series.length >= 7 && s > 0 && todayCnt >= 3) {
        const z = (todayCnt - m) / s;
        if (z >= 2.0) {
          alertsToInsert.push({
            org_id,
            day: today,
            kind: `topic_spike_z:${topic}`,
            message: `“${topic}” mentions spiked: ${todayCnt} today vs μ=${m.toFixed(
              2
            )}, σ=${s.toFixed(2)} (z=${z.toFixed(2)}).`,
            severity: "warning",
            metadata: { topic, today: todayCnt, mean: m, stdev: s, z },
          });
        }
      }
    }
  }

  // persist alerts (idempotent by org_id,day,kind)
  if (alertsToInsert.length) {
    const { error: insErr } = await sb.from("alerts").upsert(alertsToInsert, {
      onConflict: "org_id,day,kind",
      ignoreDuplicates: true,
    });
    if (insErr) return j(500, { error: insErr.message });
  }

  /* ---------- WEEKLY DIGEST (unchanged, optional) ---------- */
  const url = new URL(req.url);
  const doDigest = (url.searchParams.get("digest") || "").toString() === "1";
  const onlyOrg = (url.searchParams.get("org_id") || "").trim() || null;

  let digested = 0;
  if (doDigest) {
    const { day, start: todayStart } = todayUTC();
    const dayTo = day;
    const dayFrom = ymdUTC(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    let orgIdsForDigest: string[] = [];
    if (onlyOrg) {
      orgIdsForDigest = [onlyOrg];
    } else {
      const { data: recent } = await sb
        .from("insight_daily")
        .select("org_id")
        .gte("day", dayFrom);
      orgIdsForDigest = Array.from(
        new Set((recent ?? []).map((r: any) => r.org_id))
      ).filter(Boolean);
    }

    const { data: orgRows2 } = await sb
      .from("organizations")
      .select("id, name")
      .in(
        "id",
        orgIdsForDigest.length
          ? orgIdsForDigest
          : ["00000000-0000-0000-0000-000000000000"]
      );
    const nameById = new Map<string, string | null>();
    for (const o of orgRows2 ?? [])
      nameById.set(o.id as string, (o.name as string) ?? null);

    for (const org_id of orgIdsForDigest) {
      const pro = await isOrgPro(org_id).catch(() => false);
      if (!pro) continue;

      const { data: owners } = await sb
        .from("org_members")
        .select("user_id")
        .eq("org_id", org_id)
        .eq("role", "owner");
      const ownerIds = (owners ?? [])
        .map((r: any) => r.user_id)
        .filter(Boolean);
      const emails = new Set<string>();
      for (const uid of ownerIds) {
        try {
          const { data } = await sb.auth.admin.getUserById(uid);
          const em = data?.user?.email;
          if (em) emails.add(em);
        } catch {}
      }
      if (!emails.size) continue;

      const { data: daily7 } = await sb
        .from("insight_daily")
        .select("day, review_count, avg_rating, avg_sentiment, top_topics")
        .eq("org_id", org_id)
        .gte("day", dayFrom)
        .lte("day", dayTo)
        .order("day", { ascending: true });

      const rows = daily7 ?? [];
      const totals = rows.reduce(
        (acc: any, r: any) => {
          const c = Number(r.review_count ?? 0);
          if (Number.isFinite(c)) acc.reviews += c;
          if (r.avg_rating != null) acc.ratingNum += Number(r.avg_rating) * c;
          if (r.avg_sentiment != null)
            acc.sentNum += Number(r.avg_sentiment) * c;
          acc.den += c;
          (r.top_topics ?? []).forEach(
            (t: string) => (acc.topicBag[t] = (acc.topicBag[t] || 0) + 1)
          );
          return acc;
        },
        {
          reviews: 0,
          ratingNum: 0,
          sentNum: 0,
          den: 0,
          topicBag: {} as Record<string, number>,
        }
      );
      const avgRating =
        totals.den > 0 ? +(totals.ratingNum / totals.den).toFixed(2) : null;
      const avgSent =
        totals.den > 0 ? +(totals.sentNum / totals.den).toFixed(2) : null;
      const topTopics = Object.entries(totals.topicBag)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 8)
        .map(([t]) => String(t));

      const { data: worst } = await sb
        .from("reviews")
        .select(
          "author, rating, body, published_at, review_analysis!inner(sentiment, summary, topics)"
        )
        .eq("org_id", org_id)
        .gte("published_at", `${dayFrom}T00:00:00.000Z`)
        .order("review_analysis.sentiment", {
          ascending: true,
          nullsFirst: false,
        })
        .limit(5);

      const topReviews = (worst ?? []).map((r: any) => ({
        author: r.author ?? null,
        rating: typeof r.rating === "number" ? r.rating : null,
        body: r.body ?? null,
        published_at: r.published_at ?? null,
        sentiment: Array.isArray(r.review_analysis)
          ? r.review_analysis[0]?.sentiment ?? null
          : r.review_analysis?.sentiment ?? null,
        summary: Array.isArray(r.review_analysis)
          ? r.review_analysis[0]?.summary ?? null
          : r.review_analysis?.summary ?? null,
        topics: Array.isArray(r.review_analysis)
          ? r.review_analysis[0]?.topics ?? null
          : r.review_analysis?.topics ?? null,
      }));

      const html = renderWeeklyDigestHtml({
        orgName: nameById.get(org_id) ?? null,
        days: 7,
        totals: { reviews: totals.reviews, avgRating, avgSent },
        topTopics,
        topReviews,
      });

      const subject = `Rynith Weekly Digest — ${totals.reviews} reviews, ${
        topTopics[0] || "no top topic"
      }`;

      let anySent = false;
      for (const to of emails) {
        const ok = await sendEmailResend(to, subject, html);
        if (ok) anySent = true;
      }
      if (anySent) digested += 1;
    }
  }

  return j(200, {
    ok: true,
    updatedBaselines,
    created_alerts: alertsToInsert.length,
    weekly_digest_sent_orgs: 0,
    day: today,
    orgs: orgIds.length,
  });
}
