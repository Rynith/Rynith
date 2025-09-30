// app/dashboard/AIAdvice.tsx
import { supabaseServer } from "@/lib/supabase-server";

export default async function AIAdvice() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return null;

  const { data: mem } = await supa
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const org_id = mem?.org_id as string | undefined;
  if (!org_id) return null;

  const period_start = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const period_end = new Date().toISOString().slice(0, 10);

  const { data: row } = await supa
    .from("org_summaries")
    .select("summary, actions, positives, negatives, created_at")
    .eq("org_id", org_id)
    .eq("period_kind", "weekly")
    .gte("period_start", period_start)
    .lte("period_end", period_end)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return (
      <div className="rounded-lg border bg-white p-4 text-sm text-[#666]">
        AI recommendations will appear after we see some recent feedback.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between pb-2 border-b">
        <h2 className="font-semibold">AI Recommendations</h2>
        <span className="text-xs text-[#666]">
          Updated {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
        </span>
      </div>
      {row.summary ? <p className="mt-3 text-[#1A1A1A]">{row.summary}</p> : null}
      {Array.isArray(row.actions) && row.actions.length ? (
        <>
          <h3 className="mt-4 font-medium">Top Actions</h3>
          <ul className="list-disc ml-5 text-sm">
            {row.actions.map((a: string, i: number) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="grid md:grid-cols-2 gap-4 mt-4">
        {Array.isArray(row.positives) && row.positives.length ? (
          <div>
            <h3 className="font-medium">Double Down On</h3>
            <ul className="list-disc ml-5 text-sm">
              {row.positives.map((p: string, i: number) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {Array.isArray(row.negatives) && row.negatives.length ? (
          <div>
            <h3 className="font-medium">Fix Next</h3>
            <ul className="list-disc ml-5 text-sm">
              {row.negatives.map((n: string, i: number) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
