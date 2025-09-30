import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";

type Row = {
  id: string;
  author: string | null;
  rating: number | null;
  body: string | null;
  published_at: string | null;
  review_analysis: { sentiment: number | null; topics: string[] | null }[] | null;
};

function ymd(d: Date) { return d.toISOString().slice(0,10); }

export default async function ReviewsPage() {
  async function uploadCsv(file: File, org_id: string) {
    const sign = await fetch('/api/upload/reviews/sign', { method: 'POST', body: JSON.stringify({ org_id, filename: file.name }) })
    const { signedUrl } = await sign.json()
    await fetch(signedUrl, { method: 'PUT', body: file })
    // call an ingest edge function to parse the saved file (optional)
    }
  const supabase = await supabaseServer();

  // auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // org
  const { data: mem } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .single();
  if (!mem?.org_id) redirect("/onboarding");
  const org_id = mem.org_id as string;

  // default filters: last 7 days
  const dayTo = ymd(new Date());
  const dayFrom = ymd(new Date(Date.now() - 7*24*60*60*1000));

  // reviews + LEFT JOIN analysis
  const { data: rows, error } = await supabase
    .from("reviews")
    .select("id, author, rating, body, published_at, review_analysis!left(sentiment,topics)")
    .eq("org_id", org_id)
    .gte("published_at", `${dayFrom}T00:00:00Z`)
    .lte("published_at", `${dayTo}T23:59:59Z`)
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Reviews</h1>
        <p className="text-red-600 mt-2">Failed to load: {error.message}</p>
      </div>
    );
  }

  const list = (rows ?? []).map((r: Row) => ({
    id: r.id,
    author: r.author ?? "Anonymous",
    rating: typeof r.rating === "number" ? r.rating : null,
    sentiment: Array.isArray(r.review_analysis)
      ? r.review_analysis[0]?.sentiment ?? null
      : (r.review_analysis as any)?.sentiment ?? null,
    topics: Array.isArray(r.review_analysis)
      ? r.review_analysis[0]?.topics ?? []
      : (r.review_analysis as any)?.topics ?? [],
    body: r.body ?? "",
    published_at: r.published_at ?? null,
  }));

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Reviews</h1>
          <a
            className="text-sm px-3 py-1.5 border rounded hover:bg-gray-50"
            href="/reviews/export"
          >
            Export CSV
          </a>
        </div>

        {!list.length ? (
          <div className="p-6 bg-white border rounded">No reviews in the last 7 days.</div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <div key={r.id} className="bg-white border rounded p-4">
                <div className="flex items-center justify-between text-sm text-[#666]">
                  <div>{r.author}</div>
                  <div className="flex gap-3">
                    {r.rating != null && <span>★ {r.rating}</span>}
                    {r.sentiment != null && <span>Sent {r.sentiment}</span>}
                    <span>{r.published_at ? new Date(r.published_at).toLocaleString() : "—"}</span>
                  </div>
                </div>
                <p className="mt-2 text-[#1A1A1A]">{r.body.slice(0, 280)}{r.body.length>280?"…":""}</p>
                {!!r.topics?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.topics.map((t) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 border">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}







// // app/reviews/page.tsx  (SERVER COMPONENT)
// import { redirect } from "next/navigation";
// import { supabaseServer } from "@/lib/supabase-server";

// function ymd(d: Date) { return d.toISOString().slice(0,10); }

// export default async function ReviewsPage() {
//   const supabase = supabaseServer();

//   // auth
//   const { data: { user } } = await supabase.auth.getUser();
//   if (!user) redirect("/auth");

//   // org
//   const { data: mem } = await supabase
//     .from("org_members").select("org_id").eq("user_id", user.id).single();
//   if (!mem?.org_id) redirect("/onboarding");
//   const org_id = mem.org_id as string;

//   // filters (simple default: last 7 days, any rating/sentiment/topic)
//   const dayTo = ymd(new Date());
//   const dayFrom = ymd(new Date(Date.now() - 7*24*60*60*1000));

//   // reviews + analysis
//   const { data: rows, error } = await supabase
//     .from("reviews")
//     .select("id, author, rating, body, published_at, review_analysis!left(sentiment,topics)")
//     .eq("org_id", org_id)
//     .gte("published_at", `${dayFrom}T00:00:00Z`)
//     .lte("published_at", `${dayTo}T23:59:59Z`)
//     .order("published_at", { ascending: false })
//     .limit(50);

//   if (error) {
//     return <div className="p-6 text-red-600">Failed to load reviews: {error.message}</div>;
//   }

//   const list = (rows ?? []).map(r => ({
//     id: r.id,
//     author: r.author ?? "Anonymous",
//     rating: typeof r.rating === "number" ? r.rating : null,
//     body: r.body ?? "",
//     published_at: r.published_at ?? null,
//     sentiment: Array.isArray((r as any).review_analysis)
//       ? (r as any).review_analysis[0]?.sentiment ?? null
//       : (r as any).review_analysis?.sentiment ?? null,
//     topics: Array.isArray((r as any).review_analysis)
//       ? (r as any).review_analysis[0]?.topics ?? []
//       : (r as any).review_analysis?.topics ?? [],
//   }));
//   return (
//     <div className="min-h-screen bg-[#FAFAFA]">
//       <div className="max-w-4xl mx-auto p-6 space-y-4">
//         <h1 className="text-2xl font-bold">Reviews</h1>
//         {!list.length ? (
//           <div className="p-6 bg-white border rounded">No reviews in the last 7 days.</div>
//         ) : (
//           <div className="space-y-3">
//             {list.map(r => (
//               <div key={r.id} className="bg-white border rounded p-4">
//                 <div className="flex items-center justify-between text-sm text-[#666]">
//                   <div>{r.author}</div>
//                   <div>
//                     {r.rating != null ? `★ ${r.rating}` : ""}{r.rating!=null && r.sentiment!=null ? " • " : ""}
//                     {r.sentiment != null ? `Sent ${r.sentiment}` : ""}
//                   </div>
//                 </div>
//                 <p className="mt-1 text-[#1A1A1A]">{r.body.slice(0,240)}{r.body.length>240?"…":""}</p>
//                 {!!r.topics?.length && (
//                   <div className="mt-2 flex flex-wrap gap-2">
//                     {r.topics.map((t: string) => (
//                       <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border">{t}</span>
//                     ))}
//                   </div>
//                 )}
//                 <div className="mt-2 text-xs text-[#666]">
//                   {r.published_at ? new Date(r.published_at).toLocaleString() : "—"}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
