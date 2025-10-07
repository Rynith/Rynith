// app/settings/BillingCard.tsx (server component)
import { supabaseServer } from "@/lib/supabase-server";
import StartProButton from "@/components/StartProButton";
import Link from "next/link";

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return d!;
  }
}

export default async function BillingCard() {
  const supa = await supabaseServer();
  const { data: auth } = await supa.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return null;

  // Org / role
  const { data: mem } = await supa
    .from("org_members")
    .select("org_id, role, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const org_id = mem?.org_id as string | undefined;
  const myRole =
    (mem?.role as "owner" | "admin" | "member" | undefined) ?? "member";
  if (!org_id) return null;

  // Subscription row
  const { data: sub } = await supa
    .from("subscriptions")
    .select("tier, status, current_period_end")
    .eq("org_id", org_id)
    .maybeSingle();

  const tier = (sub?.tier || "").toLowerCase();
  const status = (sub?.status || "").toLowerCase();
  const isPro = tier === "pro" && status !== "canceled";

  const dateLabel = status === "active" ? "Renews" : "Ends";
  const renewsOrEnds =
    status === "canceled"
      ? sub?.current_period_end
        ? `Ended ${fmtDate(sub.current_period_end)}`
        : "Ended —"
      : fmtDate(sub?.current_period_end);

  const canManage = myRole === "owner";

  // If you later store invoice metadata, map it here.
  // For now, show an empty/history placeholder that nudges to the Stripe Portal.
  const billingHistory: Array<{
    id: string;
    date: string;
    description: string;
    amount: string;
    status: "paid" | "failed" | "open";
    invoice_url?: string | null;
  }> = [];

  return (
    <div className="rounded-2xl border border-[#ECECF2] bg-white overflow-hidden">
      {/* Header bar with subtle grid gradient */}
      <div
        className="relative p-5 sm:p-6 border-b border-[#ECECF2]"
        style={{
          background:
            "linear-gradient(180deg, #FAFAFD 0%, #F2F2F8 100%), radial-gradient(1200px 300px at 0% 0%, rgba(106,13,173,0.07), transparent)",
        }}
      >
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Billing</h2>
        <p className="mt-1 text-sm text-[#6b6b76]">
          Manage your subscription, view payment history, and update your
          billing details — all in one place.
        </p>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Overview row */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Subscription Overview */}
          <div className="rounded-xl border border-[#ECECF2] bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#222]">
                Subscription Overview
              </h3>
              {isPro ? (
                canManage ? (
                  <form action="/api/billing/portal" method="post">
                    <button className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-sm font-medium text-[#444] hover:bg-[#F8F8FC]">
                      Manage
                    </button>
                  </form>
                ) : (
                  <span className="rounded-lg border border-[#E7E7EF] bg-[#FAFAFD] px-3 py-1.5 text-sm text-[#666]">
                    Owner manages
                  </span>
                )
              ) : (
                <div className="flex gap-2">
                  <StartProButton plan="monthly">Upgrade</StartProButton>
                </div>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] p-3">
                <div className="text-xs text-[#6b6b76]">Current Plan</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="rounded-full bg-[#EEFDF3] px-2 py-0.5 text-xs font-medium text-[#0F9D58]">
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </span>
                  {isPro ? (
                    <span className="text-sm font-semibold">$29</span>
                  ) : (
                    <span className="text-sm font-semibold">$0</span>
                  )}
                  <span className="text-xs text-[#6b6b76]">/ Month</span>
                </div>
                <div className="mt-2 grid grid-cols-2 text-xs text-[#6b6b76]">
                  <div>
                    <div className="text-[#444]">Status</div>
                    <div className="mt-0.5 capitalize">
                      {sub?.status ?? (isPro ? "active" : "inactive")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#444]">{dateLabel}</div>
                    <div className="mt-0.5">{renewsOrEnds}</div>
                  </div>
                </div>
              </div>

              {/* Review Integrations (replaces Usage Summary in the screenshot) */}
              {/* <div className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] p-3">
                <div className="text-xs text-[#6b6b76]">Review Integrations</div>
                <p className="mt-1 text-sm text-[#444]">
                  Connect Google, Yelp, Email, and more to pull reviews
                  automatically into Rynith.
                </p>
                <div className="mt-3">
                  <Link
                    href="/settings#integrations"
                    className="inline-flex items-center rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]"
                  >
                    Manage integrations
                  </Link>
                </div>
              </div> */}
            </div>
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border border-[#ECECF2] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#222]">Payment Method</h3>

            <div className="mt-3 grid grid-cols-1 gap-3">
              {/* Stylized card (placeholder – Stripe is source of truth) */}
              <div
                className="relative overflow-hidden rounded-xl p-4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, #8B4AD7 0%, #6A0DAD 40%, #4E0C86 100%)",
                }}
              >
                <div className="text-xs uppercase tracking-wide opacity-90">
                  Visa
                </div>
                <div className="mt-6 text-lg font-semibold">
                  •••• •••• •••• 4242
                </div>
                <div className="mt-4 grid grid-cols-2 text-[11px]/4 opacity-90">
                  <div>
                    <div>NAME</div>
                    <div className="mt-0.5 font-medium">Rynith, Inc.</div>
                  </div>
                  <div className="text-right">
                    <div>VALID THRU</div>
                    <div className="mt-0.5 font-medium">02/28</div>
                  </div>
                </div>
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
                <div className="pointer-events-none absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-black/10" />
              </div>

              {/* Add / Manage card via Stripe Portal */}
              {canManage ? (
                <form action="/api/billing/portal" method="post">
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7E7EF] bg-[#FAFAFD] px-3 py-3 text-sm font-medium text-[#444] hover:bg-[#F4F4F8]"
                    type="submit"
                  >
                    <span className="text-lg leading-none">＋</span>
                    Add / Manage card in Stripe
                  </button>
                </form>
              ) : (
                <div className="rounded-xl border border-[#E7E7EF] bg-[#FAFAFD] px-3 py-3 text-center text-sm text-[#666]">
                  Billing is managed by the owner.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing History */}
        <div className="rounded-xl border border-[#ECECF2] bg-white">
          <div className="flex items-center justify-between border-b border-[#ECECF2] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#222]">Billing History</h3>
            <div>
              {/* Optional filter placeholder */}
              <button className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]">
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#ECECF2] text-left text-[#6b6b76]">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {billingHistory.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-6 text-[#6b6b76]"
                      colSpan={5}
                    >
                      No invoices yet. {canManage ? "Open the Stripe Portal to view and download invoices." : "Ask the owner to share invoices or open the Stripe Portal."}
                    </td>
                  </tr>
                ) : (
                  billingHistory.map((row) => (
                    <tr key={row.id} className="border-t border-[#F0F0F4]">
                      <td className="px-4 py-3">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">{row.description}</td>
                      <td className="px-4 py-3">{row.amount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs " +
                            (row.status === "paid"
                              ? "border-green-200 bg-green-50 text-green-700"
                              : row.status === "failed"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-amber-200 bg-amber-50 text-amber-700")
                          }
                        >
                          {row.status === "paid" ? "Paid" : row.status === "failed" ? "Failed" : "Open"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {row.invoice_url ? (
                          <a
                            href={row.invoice_url}
                            className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]"
                          >
                            Download Invoice
                          </a>
                        ) : canManage ? (
                          <form action="/api/billing/portal" method="post">
                            <button className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]">
                              Download in Stripe
                            </button>
                          </form>
                        ) : (
                          <span className="text-xs text-[#888]">No Action Available</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
















// import { supabaseServer } from "@/lib/supabase-server";
// import StartProButton from "@/components/StartProButton";

// function fmtDate(d?: string | null) {
//   if (!d) return "—";
//   try {
//     return new Date(d).toLocaleString();
//   } catch {
//     return d!;
//   }
// }

// export default async function BillingCard() {
//   const supa = await supabaseServer();
//   const { data: auth } = await supa.auth.getUser();
//   const user = auth?.user ?? null;
//   if (!user) return null;

//   // Get caller's org (latest membership)
//   const { data: mem } = await supa
//     .from("org_members")
//     .select("org_id, role, created_at")
//     .eq("user_id", user.id)
//     .order("created_at", { ascending: false })
//     .limit(1)
//     .maybeSingle();

//   const org_id = mem?.org_id as string | undefined;
//   const myRole = (mem?.role as "owner" | "admin" | "member" | undefined) ?? "member";
//   if (!org_id) return null;

//   // Subscription row
//   const { data: sub } = await supa
//     .from("subscriptions")
//     .select("tier, status, current_period_end")
//     .eq("org_id", org_id)
//     .maybeSingle();

//   const tier = (sub?.tier || "").toLowerCase();
//   const status = (sub?.status || "").toLowerCase(); // <-- define status
//   const isPro = tier === "pro" && status !== "canceled";

//   // Label + value for the date row
//   const dateLabel = status === "active" ? "Renews" : "Ends";
//   const renewsOrEnds =
//     status === "canceled"
//       ? (sub?.current_period_end ? `Ended ${fmtDate(sub.current_period_end)}` : "Ended —")
//       : fmtDate(sub?.current_period_end);

//   const canManage = myRole === "owner";

//   return (
//     <div className="bg-white border rounded shadow">
//       <div className="p-4 border-b">
//         <h3 className="font-semibold">Billing</h3>
//       </div>

//       <div className="p-4 flex flex-col gap-3 text-sm">
//         <div>
//           <div className="text-[#666]">Plan</div>
//           <div className="font-medium">{isPro ? "Pro" : "Free"}</div>
//         </div>

//         <div>
//           <div className="text-[#666]">Status</div>
//           <div className="font-medium">
//             {sub?.status ?? (isPro ? "active" : "inactive")}
//           </div>
//         </div>

//         <div>
//           <div className="text-[#666]">{dateLabel}</div>
//           <div className="font-medium">{renewsOrEnds}</div>
//         </div>

//         <div className="pt-2 flex gap-2">
//           {!isPro ? (
//             <>
//               <StartProButton plan="monthly" className="ml-2">
//                 Start Pro (Monthly)
//               </StartProButton>
//               <StartProButton plan="annual" className="ml-2">
//                 Start Pro (Annual)
//               </StartProButton>
//             </>
//           ) : canManage ? (
//             <form action="/api/billing/portal" method="post">
//               <button className="px-3 py-1.5 border rounded">Manage in Stripe</button>
//             </form>
//           ) : (
//             <div className="text-[#666]">Billing managed by the owner.</div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
