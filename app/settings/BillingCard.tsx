// import { supabaseServer } from "@/lib/supabase-server";
// import StartProButton from "@/components/StartProButton";

// function fmtDate(d?: string | null) {
//   if (!d) return "—";
//   try { return new Date(d).toLocaleString(); } catch { return d!; }
// }

// export default async function BillingCard() {
//   const supa = await supabaseServer();
//   const { data: auth } = await supa.auth.getUser();
//   const user = auth?.user ?? null;
//   if (!user) return null;

//   // Caller org / role
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

//   // Subscription
//   const { data: sub } = await supa
//     .from("subscriptions")
//     .select("tier, status, current_period_end, stripe_mode")
//     .eq("org_id", org_id)
//     .maybeSingle();

//   const tier = (sub?.tier || "").toLowerCase();
//   const status = (sub?.status || "").toLowerCase(); // "active" | "trialing" | "canceled" | etc.
//   const isPro = tier === "pro" && status !== "canceled";
//   const dateLabel = status === "active" ? "Renews" : status === "trialing" ? "Trial ends" : "Ends";
//   const renewsOrEnds =
//     status === "canceled"
//       ? (sub?.current_period_end ? `Ended ${fmtDate(sub.current_period_end)}` : "Ended —")
//       : fmtDate(sub?.current_period_end);

//   const canManage = myRole === "owner";
//   const inTestMode = (sub?.stripe_mode || "").toLowerCase() === "test";

//   return (
//     <div className="rounded-2xl border border-[#ECECF2] bg-white">
//       <div className="flex items-center justify-between border-b border-[#ECECF2] px-4 py-3">
//         <h3 className="text-base font-semibold">Billing</h3>
//         {inTestMode && (
//           <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
//             Stripe Test Mode
//           </span>
//         )}
//       </div>

//       <div className="grid gap-4 p-4 sm:grid-cols-2">
//         <div className="rounded-xl border border-[#ECECF2] p-4">
//           <dl className="grid grid-cols-2 gap-y-2 text-sm">
//             <dt className="text-[#666]">Plan</dt>
//             <dd className="font-medium">{isPro ? "Pro" : "Free"}</dd>

//             <dt className="text-[#666]">Status</dt>
//             <dd className="font-medium capitalize">
//               {sub?.status ?? (isPro ? "active" : "inactive")}
//             </dd>

//             <dt className="text-[#666]">{dateLabel}</dt>
//             <dd className="font-medium">{renewsOrEnds}</dd>
//           </dl>

//           <div className="mt-3 flex flex-wrap gap-2">
//             {!isPro ? (
//               <>
//                 <StartProButton plan="monthly" className="rounded-lg border px-3 py-2 text-sm">
//                   Start Pro (Monthly)
//                 </StartProButton>
//                 <StartProButton plan="annual" className="rounded-lg border px-3 py-2 text-sm">
//                   Start Pro (Annual)
//                 </StartProButton>
//               </>
//             ) : canManage ? (
//               <form action="/api/billing/portal" method="post" className="flex gap-2">
//                 {/* Stripe portal opens with payment methods & invoices inside */}
//                 <button
//                   className="rounded-lg border border-[#ECECF2] px-3 py-2 text-sm font-medium hover:bg-[#F8F8FC]"
//                   name="intent"
//                   value="payment_method"
//                 >
//                   Manage payment method
//                 </button>
//                 <button
//                   className="rounded-lg border border-[#ECECF2] px-3 py-2 text-sm font-medium hover:bg-[#F8F8FC]"
//                   name="intent"
//                   value="invoices"
//                 >
//                   Download invoices
//                 </button>
//               </form>
//             ) : (
//               <div className="text-sm text-[#666]">Billing managed by the owner.</div>
//             )}
//           </div>
//         </div>

//         <div className="rounded-xl border border-[#ECECF2] p-4">
//           <h4 className="mb-2 text-sm font-semibold">Review Integrations</h4>
//           <p className="text-sm text-[#6b6b76]">
//             Connect Google, Yelp, email and more to centralize reviews and unlock AI insights.
//             Manage sources in <a href="/settings?tab=integrations" className="text-[var(--primaryFrom)] underline">Integrations</a>.
//           </p>
//           <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#444]">
//             <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">Google Reviews</li>
//             <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">Yelp</li>
//             <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">Email (forward)</li>
//             <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">Twitter/X</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// }
// // app/settings/BillingCard.tsx (server component)










// app/settings/BillingCard.tsx
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
    .select("tier, status, current_period_end, stripe_mode")
    .eq("org_id", org_id)
    .maybeSingle();

  const tier = (sub?.tier || "").toLowerCase();
  const status = (sub?.status || "").toLowerCase();
  const isPro = tier === "pro" && status !== "canceled";

  const dateLabel =
    status === "active" ? "Renews" : status === "trialing" ? "Trial ends" : "Ends";
  const renewsOrEnds =
    status === "canceled"
      ? sub?.current_period_end
        ? `Ended ${fmtDate(sub.current_period_end)}`
        : "Ended —"
      : fmtDate(sub?.current_period_end);

  const canManage = myRole === "owner";
  const inTestMode = (sub?.stripe_mode || "").toLowerCase() === "test";

  // Placeholder until you store invoice metadata locally
  const billingHistory: Array<{
    id: string;
    date: string;
    description: string;
    amount: string;
    status: "paid" | "failed" | "open";
    invoice_url?: string | null;
  }> = [];

  return (
    <section className="rounded-2xl border border-[#ECECF2] bg-white overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between border-b border-[#ECECF2] px-4 py-3"
        style={{
          background:
            "linear-gradient(180deg, #FAFAFD 0%, #F2F2F8 100%), radial-gradient(1200px 300px at 0% 0%, rgba(106,13,173,0.07), transparent)",
        }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-[#1A1A1A]">Billing</h2>
          {inTestMode && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
              Stripe Test Mode
            </span>
          )}
        </div>
        {isPro ? (
          canManage ? (
            <form action="/api/billing/portal" method="post">
              <button
                className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-sm font-medium text-[#444] hover:bg-[#F8F8FC]"
                type="submit"
                name="intent"
                value="overview"
              >
                Manage in Stripe
              </button>
            </form>
          ) : (
            <span className="rounded-lg border border-[#E7E7EF] bg-[#FAFAFD] px-3 py-1.5 text-sm text-[#666]">
              Owner manages
            </span>
          )
        ) : (
          <div className="flex gap-2">
            <StartProButton plan="monthly" className="rounded-lg border px-3 py-1.5 text-sm">
              Start Pro (Monthly)
            </StartProButton>
            <StartProButton plan="annual" className="rounded-lg border px-3 py-1.5 text-sm">
              Start Pro (Annual)
            </StartProButton>
          </div>
        )}
      </div>

      {/* Subheader copy under the bar, full width */}
      <div className="px-4 pt-3 text-sm text-[#6b6b76]">
        Manage your subscription, view payment history, and update your billing details — all in one place.
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 p-4 ">
        {/* Left column: Subscription overview + Payment method */}
        <div className="space-y-4">
          {/* Subscription Overview */}
          <div className="rounded-xl border border-[#ECECF2] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#222]">Subscription Overview</h3>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] p-3">
                <div className="text-xs text-[#6b6b76]">Current Plan</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (isPro
                        ? "bg-[#EEFDF3] text-[#0F9D58]"
                        : "bg-[#F4F4F8] text-[#444]")
                    }
                  >
                    {isPro ? "Pro Plan" : "Free Plan"}
                  </span>
                  <span className="text-sm font-semibold">{isPro ? "$29" : "$0"}</span>
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

              <div className="rounded-xl border border-[#ECECF2] p-4">
                <h4 className="mb-2 text-sm font-semibold">Review Integrations</h4>
                <p className="text-sm text-[#6b6b76]">
                  Connect Google, Yelp, email and more to centralize reviews and unlock AI insights.
                  Manage sources in{" "}
                  <Link
                    href="/settings?tab=integrations"
                    className="text-[var(--primaryFrom)] underline"
                  >
                    Integrations
                  </Link>.
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-xs text-[#444]">
                  <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">
                    Google Reviews
                  </li>
                  <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">
                    Yelp
                  </li>
                  <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">
                    Email (forward)
                  </li>
                  <li className="rounded-lg border border-[#ECECF2] bg-[#FAFAFD] px-2 py-1.5">
                    Twitter/X
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="rounded-xl border border-[#ECECF2] bg-white p-4">
            <h3 className="text-sm font-semibold text-[#222]">Payment Method</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              {/* Stylized card preview (informational; Stripe is source of truth) */}
              <div
                className="relative overflow-hidden rounded-xl p-4 text-white grid-cols-2"
                style={{
                  background:
                    "linear-gradient(135deg, #8B4AD7 0%, #6A0DAD 40%, #4E0C86 100%)",
                }}
                aria-label="Saved card preview"
              >
                <div className="text-xs uppercase tracking-wide opacity-90">Visa</div>
                <div className="mt-6 text-lg font-semibold">•••• •••• •••• 4242</div>
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
               {canManage ? (
                <form action="/api/billing/portal" method="post">
                  <button
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7E7EF] bg-[#FAFAFD] px-3 py-3 text-sm font-medium text-[#444] hover:bg-[#F4F4F8]"
                    type="submit"
                    name="intent"
                    value="payment_method"
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

           <div className="rounded-xl border border-[#ECECF2] bg-white md:col-span-1">
          <div className="flex items-center justify-between border-b border-[#ECECF2] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#222]">Billing History</h3>
            <div>
              <button
                className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]"
                type="button"
              >
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
                    <td className="px-4 py-6 text-[#6b6b76]" colSpan={5}>
                      No invoices yet.{" "}
                      {canManage
                        ? "Open the Stripe Portal to view and download invoices."
                        : "Ask the owner to share invoices or open the Stripe Portal."}
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
                          {row.status === "paid"
                            ? "Paid"
                            : row.status === "failed"
                            ? "Failed"
                            : "Open"}
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
                            <button
                              className="rounded-lg border border-[#E7E7EF] bg-white px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]"
                              name="intent"
                              value="invoices"
                            >
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

        {/* Right column: Billing history (spans full width on larger screens via md:col-span-2 below) */}
       

        {/* Make history span full width on large screens too */}
        <div className="md:col-span-2" />
      </div>
    </section>
  );
}