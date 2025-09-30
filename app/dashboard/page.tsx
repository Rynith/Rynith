// app/dashboard/page.tsx — MVP+ with CTAs, range, pro gate, sync, digest, export
export const dynamic = "force-dynamic";
import { revalidatePath } from "next/cache";
import AIAdvice from "./AIAdvice";

import { supabaseServer } from "@/lib/supabase-server";
import TrendChart from "@/app/dashboard/TrendChart";
import FilterBar from "@/app/dashboard/FilterBar";
import Link from "next/link";

// ---------- Server Actions (safe; env never reaches client) ----------
async function actionSyncNow() {
  "use server";
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const key = process.env.INTERNAL_SYNC_KEY;
  if (key) {
    await fetch(`${base}/api/sources/sync`, {
      method: "POST",
      headers: { "x-internal-key": key },
      cache: "no-store",
    }).catch(() => {});
  }
  // ✅ force the dashboard to re-fetch from DB
  revalidatePath("/dashboard");
}

// async function actionSendTestDigest() {
//   "use server";
//   const base =
//     process.env.NEXT_PUBLIC_BASE_URL ||
//     (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
//   const key = process.env.INTERNAL_SYNC_KEY;
//   if (!key) return;
//   await fetch(`${base}/api/digest/run?test=1`, {
//     method: "POST",
//     headers: { "x-internal-key": key },
//     cache: "no-store",
//   }).catch(() => {});
// }

async function actionSendTestDigest() {
  "use server";
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const key = process.env.INTERNAL_SYNC_KEY;
  if (key) {
    await fetch(`${base}/api/digest/run?test=1`, {
      method: "POST",
      headers: { "x-internal-key": key },
      cache: "no-store",
    }).catch(() => {});
  }
  revalidatePath("/dashboard");
}
// ----------------------------------------------------------------------

type Daily = {
  day: string;
  review_count: number | null;
  avg_rating: number | null;
  avg_sentiment: number | null;
  top_topics: string[] | null;
};

type LatestRow = {
  id: string;
  author: string | null;
  rating: number | null;
  body: string | null;
  published_at: string | null;
  review_analysis: {
    sentiment: number | null;
    topics: string[] | null;
    summary: string | null;
  } | null;
};

type AlertRow = {
  day: string;
  kind: string;
  message: string;
  severity: string | null;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Next 15: await searchParams
  const sp = await searchParams;
  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? (v[0] ?? "") : (v ?? "");

  // Range + filters from URL
  const rangeDays = Number(pick(sp.range)) === 30 ? 30 : 7;
  const rawTopic = pick(sp.topic).trim();
  const topic = rawTopic && rawTopic !== "__all__" ? rawTopic : null;
  const rawMin = pick(sp.minRating).trim();
  const minRating =
    rawMin && rawMin !== "__any__" && !Number.isNaN(Number(rawMin))
      ? Number(rawMin)
      : null;

  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user ?? null;

  // Robust membership lookup (no redirects here; middleware already gates)
  let org_id: string | null = null;
  if (user) {
    const { data: memRows } = await supabase
      .from("org_members")
      .select("org_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    org_id = memRows?.[0]?.org_id ?? null;
  }

  if (!user || !org_id) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto p-6 space-y-4">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <div className="rounded-lg border bg-white p-4 text-sm text-[#666]">
            We’re preparing your workspace…
            <span className="ml-1">
              <Link href="/onboarding" className="underline">finish onboarding</Link>
              {" or "}
              <Link href="/dashboard" className="underline">refresh</Link>.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // -------- Range window --------
  const dayTo = ymd(new Date());
  const dayFrom = ymd(new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000));

  // -------- Pro status --------
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("org_id", org_id)
    .maybeSingle();
  const isPro = (subRow?.tier || "").toLowerCase() === "pro" && (subRow?.status || "") === "active";

  // -------- Source health --------
  const { data: sources } = await supabase
    .from("sources")
    .select("id, kind, status, last_sync_at, next_sync_at")
    .eq("org_id", org_id)
    .order("kind", { ascending: true });

  const lastSyncAt =
    sources?.map((s) => s.last_sync_at).filter(Boolean).sort()?.reverse()?.[0] || null;
  const nextSyncAt =
    sources?.map((s) => s.next_sync_at).filter(Boolean).sort()?.[0] || null;

  // -------- Daily insights --------
  const { data: daily, error: dErr } = await supabase
    .from("insight_daily")
    .select("day, review_count, avg_rating, avg_sentiment, top_topics")
    .eq("org_id", org_id)
    .gte("day", dayFrom)
    .lte("day", dayTo)
    .order("day", { ascending: true });

  // -------- Alerts --------
  const { data: alerts, error: aErr } = await supabase
    .from("alerts")
    .select("day, kind, message, severity")
    .eq("org_id", org_id)
    .order("day", { ascending: false })
    .limit(20);

  const today = ymd(new Date());
  const todayAlert =
    (alerts ?? []).find(
      (a) => a.day === today && (a.severity === "warning" || a.severity === "error")
    ) || null;

  // -------- Latest reviews + analysis --------
  const { data: latestRaw, error: lErr } = await supabase
    .from("reviews")
    .select(
      "id, author, rating, body, published_at, review_analysis!left(sentiment,topics,summary)"
    )
    .eq("org_id", org_id)
    .order("published_at", { ascending: false })
    .limit(200);

  // -------- Backfill / analyze progress --------
  const { count: totalReviewCount } = await supabase
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("org_id", org_id);

  const { count: analyzedCount } = await supabase
    .from("review_analysis")
    .select("review_id, reviews!inner(org_id)", { count: "exact", head: true })
    .eq("reviews.org_id", org_id);

  // Render error if any primary query failed
  if (dErr || aErr || lErr) {
    const msg = dErr?.message || aErr?.message || lErr?.message || "Unknown error";
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-red-600 mt-2">Failed to load data: {msg}</p>
      </div>
    );
  }

  const rows: Daily[] = daily ?? [];

  // Weighted metrics
  const totalReviews = rows.reduce((n, r) => n + (r.review_count ?? 0), 0);
  const weighted = rows.reduce(
    (acc, r) => {
      const c = r.review_count ?? 0;
      if (r.avg_rating != null) acc.ratingNum += r.avg_rating * c;
      if (r.avg_sentiment != null) acc.sentNum += r.avg_sentiment * c;
      acc.den += c;
      (r.top_topics ?? []).forEach((t) => (acc.topicBag[t] = (acc.topicBag[t] || 0) + 1));
      return acc;
    },
    { ratingNum: 0, sentNum: 0, den: 0, topicBag: {} as Record<string, number> }
  );

  const avgRating = weighted.den > 0 ? +(weighted.ratingNum / weighted.den).toFixed(2) : null;
  const avgSentiment = weighted.den > 0 ? +(weighted.sentNum / weighted.den).toFixed(2) : null;

  const topTopics = Object.entries(weighted.topicBag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([t]) => t);

  const latestAll: LatestRow[] = ((latestRaw ?? []) as any[]).map((r) => ({
    id: r.id,
    author: r.author ?? null,
    rating: typeof r.rating === "number" ? r.rating : null,
    body: r.body ?? null,
    published_at: r.published_at ?? null,
    review_analysis: Array.isArray(r.review_analysis)
      ? r.review_analysis[0] ?? null
      : r.review_analysis ?? null,
  }));

  const latestReviews = latestAll
    .filter((r) => (topic ? (r.review_analysis?.topics || []).includes(topic) : true))
    .filter((r) => (minRating ? (r.rating ?? 0) >= minRating : true))
    .slice(0, 10);

  // Progress
  const analyzed = analyzedCount ?? 0;
  const totalForAnalyze = totalReviewCount ?? 0;
  const hasBackfill = totalForAnalyze > 0 && analyzed < totalForAnalyze;
  const pct = hasBackfill ? Math.round((analyzed / Math.max(1, totalForAnalyze)) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Pro banner */}
        {!isPro && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm flex items-center justify-between">
            <span>Unlock email alerts & CSV export with Pro.</span>
            <form action="/api/billing/checkout" method="post">
              <button className="px-3 py-1.5 border rounded bg-white">Start Pro</button>
            </form>
          </div>
        )}

        {/* Today alert highlight */}
        {todayAlert && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            <strong className="mr-2">{todayAlert.kind}</strong>
            {todayAlert.message}
          </div>
        )}

        {/* Source health + actions */}
        <div className="rounded-lg border bg-white p-3 text-sm flex flex-wrap gap-3 items-center justify-between">
          <div className="text-[#666]">
            Last sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : "—"} • Next:{" "}
            {nextSyncAt ? new Date(nextSyncAt).toLocaleString() : "—"}
          </div>
          <div className="flex gap-2">
            <form action={actionSyncNow}>
              <button className="px-3 py-1.5 border rounded">Sync now</button>
            </form>
            <form action={actionSendTestDigest}>
              <button className="px-3 py-1.5 border rounded">Send test digest</button>
            </form>
            {isPro ? (
              <a className="px-3 py-1.5 border rounded" href="/api/export">Export CSV</a>
            ) : (
              <button className="px-3 py-1.5 border rounded opacity-50 cursor-not-allowed" title="Pro only">
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Header + range switcher */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A]">Weekly Summary</h1>
            <p className="text-[#666]">
              Hello {user.email}. Your customer feedback insights for the last {rangeDays} days.
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              href="/dashboard?range=7"
              className={`px-2 py-1.5 border rounded ${rangeDays === 7 ? "bg-gray-100" : ""}`}
            >
              7 days
            </Link>
            <Link
              href="/dashboard?range=30"
              className={`px-2 py-1.5 border rounded ${rangeDays === 30 ? "bg-gray-100" : ""}`}
            >
              30 days
            </Link>
          </div>
        </div>

        {/* Empty-state CTA */}
        {totalReviews === 0 && (
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm text-[#1A1A1A] font-medium mb-2">No reviews yet</p>
            <p className="text-sm text-[#666] mb-3">Get data into your workspace:</p>
            <div className="flex gap-2">
              <Link href="/onboarding" className="px-3 py-2 border rounded">Connect Email Ingestion</Link>
              <Link href="/onboarding" className="px-3 py-2 border rounded">Upload CSV</Link>
            </div>
            <p className="text-xs text-[#999] mt-2">
              Data appears within ~1 minute after forwarding or upload.
            </p>
          </div>
        )}

        {/* Analyze/backfill progress */}
        {hasBackfill && (
          <div className="rounded-lg border bg-white p-3 text-sm">
            Analyzing reviews… {analyzed}/{totalForAnalyze} ({pct}%)
          </div>
        )}

        {/* Metric tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Total Reviews" value={String(totalReviews)} />
          <MetricCard title="Avg Rating" value={avgRating != null ? String(avgRating) : "—"} />
          <MetricCard title="Avg Sentiment" value={avgSentiment != null ? String(avgSentiment) : "—"} />
        </div>

        {/* Trend charts */}
        <TrendChart data={rows} />

        {/* Alerts list */}
        {(alerts ?? []).length ? (
          <div className="bg-white rounded-lg border shadow">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Alerts</h2>
            </div>
            <div className="divide-y">
              {(alerts as AlertRow[]).map((a, i) => (
                <div key={i} className="p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500">
                      {a.day} • {a.kind}
                    </div>
                    {a.severity ? (
                      <span
                        className={`px-2 py-0.5 rounded-full border text-xs ${
                          a.severity === "error"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : a.severity === "warning"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {a.severity}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-gray-900 mt-1">{a.message}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border shadow p-4 text-sm text-[#666]">No alerts yet.</div>
        )}

        {/* Filters + “view all” when a topic is selected */}
        <FilterBar topics={topTopics} />
        {topic && (
          <div className="text-sm">
            <Link href={`/dashboard?topic=${encodeURIComponent(topic)}`} className="underline">
              View all reviews with “{topic}”
            </Link>
          </div>
        )}

        {/* Latest Reviews */}
        <div className="bg-white rounded-lg border shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-[#1A1A1A]">Latest Reviews</h2>
          </div>
          <div className="divide-y">
            {latestReviews.length ? (
              latestReviews.map((r) => (
                <div key={r.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#666]">
                      {r.author || "Anonymous"} • {r.published_at ? new Date(r.published_at).toLocaleString() : "—"}
                    </div>
                    <div className="text-sm text-[#666]">
                      {r.rating != null ? `★ ${r.rating}` : null}{" "}
                      {r.review_analysis?.sentiment != null ? `• Sent ${r.review_analysis.sentiment}` : null}
                    </div>
                  </div>
                  <p className="mt-1 text-[#1A1A1A]">
                    {(r.review_analysis?.summary || r.body || "").slice(0, 200)}
                    {r.body && r.body.length > 200 ? "…" : ""}
                  </p>
                  {r.review_analysis?.topics?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.review_analysis.topics.map((t) => (
                        <span key={t} className="text-xs px-2 py-1 rounded-full bg-gray-50 text-gray-700 border">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="p-6 text-sm text-[#666]">
                No reviews match your filters. Remove filters or forward some reviews. In Settings → Sources, copy your
                <strong> email alias</strong> and set up forwarding, or upload a CSV on the Onboarding screen.
              </div>
            )}
          </div>
        </div>

        <AIAdvice />

      </div>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border shadow p-4">
      <div className="text-sm text-[#666]">{title}</div>
      <div className="text-2xl font-bold text-[#1A1A1A] mt-1">{value}</div>
    </div>
  );
}
