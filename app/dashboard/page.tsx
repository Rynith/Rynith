// app/dashboard/page.tsx (SERVER COMPONENT)
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

type Daily = {
  day: string; // YYYY-MM-DD
  review_count: number | null;
  avg_rating: number | null;
  avg_sentiment: number | null;
  top_topics: string[] | null;
};

type LatestReview = {
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

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const supabase = supabaseServer();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Find org
  const { data: mem, error: memErr } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();

  if (memErr || !mem?.org_id) redirect("/onboarding");
  const org_id = mem.org_id as string;

  // Time window (last 7 days)
  const dayTo = ymd(new Date());
  const dayFrom = ymd(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

  // Pull daily insights
  const { data: daily, error: dErr } = await supabase
    .from("insight_daily")
    .select("day, review_count, avg_rating, avg_sentiment, top_topics")
    .eq("org_id", org_id)
    .gte("day", dayFrom)
    .lte("day", dayTo)
    .order("day", { ascending: true });

  if (dErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-red-600 mt-2">Failed to load insights: {dErr.message}</p>
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
      // topics bag
      (r.top_topics ?? []).forEach((t) => (acc.topicBag[t] = (acc.topicBag[t] || 0) + 1));
      return acc;
    },
    { ratingNum: 0, sentNum: 0, den: 0, topicBag: {} as Record<string, number> }
  );

  const avgRating =
    weighted.den > 0 && weighted.ratingNum > 0 ? +(weighted.ratingNum / weighted.den).toFixed(2) : null;
  const avgSentiment =
    weighted.den > 0 ? +(weighted.sentNum / weighted.den).toFixed(2) : null;

  const topTopics = Object.entries(weighted.topicBag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  // Latest reviews (join analysis)
 // Force LEFT JOIN so rows without analysis still return
  // Force LEFT JOIN so rows without analysis still return
const { data: latest, error: lErr } = await supabase
  .from("reviews")
  .select(
    "id, author, rating, body, published_at, review_analysis!left(sentiment,topics,summary)"
  )
  .eq("org_id", org_id)
  .order("published_at", { ascending: false })
  .limit(10);

if (lErr) {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="text-red-600 mt-2">Failed to load latest reviews: {lErr.message}</p>
    </div>
  );
}

// Normalize the nested shape (array | object | null) → object | null
const latestReviews: LatestReview[] = ((latest ?? []) as any[]).map((r) => ({
  id: r.id,
  author: r.author ?? null,
  rating: typeof r.rating === "number" ? r.rating : null,
  body: r.body ?? null,
  published_at: r.published_at ?? null,
  review_analysis: Array.isArray(r.review_analysis)
    ? r.review_analysis[0] ?? null
    : r.review_analysis ?? null,
}));

  // const latestReviews: LatestReview[] = latest ?? [];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Weekly Summary</h1>
          <p className="text-[#666]">Your customer feedback insights for the last 7 days</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard title="Total Reviews" value={String(totalReviews)} />
          <MetricCard title="Avg Rating" value={avgRating != null ? String(avgRating) : "—"} />
          <MetricCard title="Avg Sentiment" value={avgSentiment != null ? String(avgSentiment) : "—"} />
        </div>

        {/* Top topics */}
        <div className="bg-white rounded-lg border shadow p-4">
          <h2 className="font-semibold text-[#1A1A1A] mb-2">Top Topics</h2>
          {topTopics.length ? (
            <div className="flex flex-wrap gap-2">
              {topTopics.map((t) => (
                <span key={t} className="text-xs px-2 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#666]">No topics yet. Try forwarding some reviews or upload a CSV.</p>
          )}
        </div>

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
                      {r.author || "Anonymous"} •{" "}
                      {r.published_at ? new Date(r.published_at).toLocaleString() : "—"}
                    </div>
                    <div className="text-sm text-[#666]">
                      {r.rating != null ? `★ ${r.rating}` : null}{" "}
                      {r.review_analysis?.sentiment != null ? `• Sent ${r.review_analysis.sentiment}` : null}
                    </div>
                  </div>
                  <p className="mt-1 text-[#1A1A1A]">
                    {(r.review_analysis?.summary || r.body || "").slice(0, 200)}
                    {(r.body && r.body.length > 200) ? "…" : ""}
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
                No reviews yet. In Settings → Sources, copy your **email alias** and set up forwarding,
                or upload a CSV on the Onboarding screen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// tiny server component for metric tiles
function MetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border shadow p-4">
      <div className="text-sm text-[#666]">{title}</div>
      <div className="text-2xl font-bold text-[#1A1A1A] mt-1">{value}</div>
    </div>
  );
}
