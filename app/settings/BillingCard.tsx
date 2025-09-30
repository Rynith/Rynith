import { supabaseServer } from "@/lib/supabase-server";
import StartProButton from "@/components/StartProButton";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d!;
  }
}

export default async function BillingCard() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return null;

  // Get caller's org (latest membership)
  const { data: mem } = await supa
    .from("org_members")
    .select("org_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const org_id = mem?.org_id as string | undefined;
  const myRole = (mem?.role as "owner" | "admin" | "member" | undefined) ?? "member";
  if (!org_id) return null;

  // Subscription row
  const { data: sub } = await supa
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("org_id", org_id)
    .maybeSingle();

  const tier = (sub?.tier || "").toLowerCase();
  const status = (sub?.status || "").toLowerCase(); // <-- define status
  const isPro = tier === "pro" && status !== "canceled";

  // Label + value for the date row
  const dateLabel = status === "active" ? "Renews" : "Ends";
  const renewsOrEnds =
    status === "canceled"
      ? (sub?.current_period_end ? `Ended ${fmtDate(sub.current_period_end)}` : "Ended —")
      : fmtDate(sub?.current_period_end);

  const canManage = myRole === "owner";

  return (
    <div className="bg-white border rounded shadow">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Billing</h3>
      </div>

      <div className="p-4 flex flex-col gap-3 text-sm">
        <div>
          <div className="text-[#666]">Plan</div>
          <div className="font-medium">{isPro ? "Pro" : "Free"}</div>
        </div>

        <div>
          <div className="text-[#666]">Status</div>
          <div className="font-medium">
            {sub?.status ?? (isPro ? "active" : "inactive")}
          </div>
        </div>

        <div>
          <div className="text-[#666]">{dateLabel}</div>
          <div className="font-medium">{renewsOrEnds}</div>
        </div>

        <div className="pt-2 flex gap-2">
          {!isPro ? (
            <>
              <StartProButton plan="monthly" className="ml-2">
                Start Pro (Monthly)
              </StartProButton>
              <StartProButton plan="annual" className="ml-2">
                Start Pro (Annual)
              </StartProButton>
            </>
          ) : canManage ? (
            <form action="/api/billing/portal" method="post">
              <button className="px-3 py-1.5 border rounded">Manage in Stripe</button>
            </form>
          ) : (
            <div className="text-[#666]">Billing managed by the owner.</div>
          )}
        </div>
      </div>
    </div>
  );
}
