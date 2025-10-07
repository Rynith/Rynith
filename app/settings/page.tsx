// app/settings/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import RetrySyncButton from "@/app/settings/retrysyncbutton";
import ShowEmailAliasButton from "@/app/settings/showEmailAliasButton";
import MembersManager from "./members-client";
import BillingCard from "./BillingCard";
import Link from "next/link";

type SourceRow = {
  id: string;
  kind: "email" | "google" | "yelp" | "twitter" | string;
  display_name: string | null;
  status: "connected" | "disconnected" | "error" | "pending" | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  error: string | null;
  config: { alias?: string | null } | null;
};

const PURPLE = { base: "#6A0DAD", dark: "#5A0B96" };

const NAV = [
  { tab: "mydetails", label: "My details", icon: "👤" },
  { tab: "profile", label: "Profile", icon: "🪪" },
  { tab: "password", label: "Password", icon: "🔒" },
  { tab: "team", label: "Team", icon: "👥" },
  { tab: "billing", label: "Billing", icon: "💳" },
  { tab: "notifications", label: "Notifications", icon: "🔔" },
  { tab: "integrations", label: "Integrations", icon: "🧩" },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const tab = (searchParams?.tab || "integrations").toLowerCase();

  const supabase = await supabaseServer();

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Membership (used by multiple tabs)
  const { data: memRows } = await supabase
    .from("org_members")
    .select("org_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const org_id = memRows?.[0]?.org_id as string | undefined;
  if (!org_id) redirect("/onboarding");

  // Lazy-load data only for the active tab
  let sources: SourceRow[] = [];
  if (tab === "integrations") {
    const { data } = await supabase
      .from("sources")
      .select(
        "id, kind, display_name, status, last_sync_at, next_sync_at, error, config"
      )
      .eq("org_id", org_id)
      .order("kind", { ascending: true });
    sources = (data ?? []) as any[];
  }

  const linkFor = (t: string) => `/settings?tab=${encodeURIComponent(t)}`;

  return (
    <div className="min-h-screen bg-[#F4F4F8]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          {/* LEFT: Sidebar */}
          <aside
            className="rounded-2xl p-4 text-white"
            style={{
              background: `linear-gradient(180deg, ${PURPLE.base}, ${PURPLE.dark})`,
            }}
          >
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15">
                <span className="h-2 w-2 rounded-full bg-white/90" />
              </div>
              <div>
                <p className="text-sm/5 opacity-90">Settings</p>
                <p className="text-xs/5 opacity-70">{user.email}</p>
              </div>
            </div>

            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = tab === item.tab;
                return (
                  <Link
                    key={item.tab}
                    href={linkFor(item.tab)}
                    className={
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition " +
                      (active ? "bg-white/15 font-medium" : "hover:bg-white/10 opacity-90")
                    }
                    aria-current={active ? "page" : undefined}
                  >
                    <span aria-hidden>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 flex items-center gap-3 rounded-xl bg-white/10 p-2">
              <div className="h-8 w-8 rounded-full bg-white/40" />
              <div className="min-w-0">
                <p className="truncate text-xs/5 opacity-90">{user.email}</p>
                <p className="truncate text-[10px]/4 opacity-70">Signed in</p>
              </div>
            </div>
          </aside>

          {/* RIGHT: Only the active tab's panel renders */}
          <main className="rounded-2xl border border-[#ECECF2] bg-white p-4 sm:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECECF2] pb-3">
              <h1 className="text-xl font-semibold sm:text-2xl capitalize">{tab}</h1>
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search"
                  className="w-44 rounded-lg border border-[#E7E7EF] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[rgba(138,74,215,0.25)]"
                />
              </div>
            </div>

            {/* Secondary pills (kept, as requested earlier) */}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              {["View all", "Developer tools", "Communication", "Productivity", "Browser tools", "Marketplace"].map(
                (label, i) => (
                  <button
                    key={label}
                    className={
                      "rounded-full border px-3 py-1.5 " +
                      (i === 0
                        ? "border-transparent bg-[--pill,#F2ECFF] text-[--pill-text,#5B2EBF]"
                        : "border-[#E7E7EF] text-[#444] hover:bg-[#F8F8FC]")
                    }
                  >
                    {label}
                  </button>
                )
              )}
            </div>

            {/* ACTIVE PANEL ONLY */}
            <div className="mt-6">
              {tab === "billing" && (
                <>
                  <p className="text-sm text-[#6b6b76]">
                    Manage your subscription, view payment history, and update your billing details.
                  </p>
                  <div className="mt-4 rounded-2xl border border-[#ECECF2] bg-white p-4">
                    <BillingCard />
                  </div>
                </>
              )}

              {tab === "integrations" && (
                <>
                  <h2 className="text-base font-semibold text-[#222]">
                    Integrations and connected apps
                  </h2>
                  <p className="mt-1 text-sm text-[#6b6b76]">
                    Supercharge your workflow and connect the tools you use every day.
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {!sources.length ? (
                      <div className="rounded-2xl border border-[#ECECF2] bg-white p-6 text-sm text-[#666]">
                        No sources connected yet.
                      </div>
                    ) : (
                      sources.map((s) => {
                        const label =
                          s.display_name || s.kind.charAt(0).toUpperCase() + s.kind.slice(1);
                        const ok = s.status === "connected";
                        const err = s.status === "error";
                        return (
                          <div
                            key={s.id}
                            className="flex flex-col justify-between rounded-xl border border-[#ECECF2] bg-white p-4 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className="grid h-10 w-10 place-items-center rounded-lg"
                                style={{
                                  background: ok ? "#EEFDF3" : err ? "#FEF2F2" : "#F4F4F8",
                                  color: ok ? "#0F9D58" : err ? "#DC2626" : "#6B7280",
                                }}
                              >
                                <span className="text-sm font-semibold">{label.slice(0, 1)}</span>
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-[#1A1A1A]">
                                  {label}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-xs text-[#6b6b76]">
                                  {describeSource(s.kind)}
                                </p>
                              </div>
                              <div className="ml-auto">
                                <span
                                  className={
                                    "inline-flex h-6 w-11 items-center rounded-full p-0.5 transition " +
                                    (ok ? "bg-[rgba(106,13,173,0.9)]" : "bg-[#E7E7EF]")
                                  }
                                  title={ok ? "Connected" : "Disconnected"}
                                >
                                  <span
                                    className={
                                      "h-5 w-5 rounded-full bg-white shadow transition " +
                                      (ok ? "translate-x-5" : "translate-x-0")
                                    }
                                    style={{ display: "inline-block" }}
                                  />
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6b6b76]">
                              <span className="rounded-full border border-[#ECECF2] bg-[#FAFAFD] px-2 py-0.5">
                                {s.status || "unknown"}
                              </span>
                              <span>•</span>
                              <span>Last sync: {s.last_sync_at ? new Date(s.last_sync_at).toLocaleString() : "—"}</span>
                              <span>•</span>
                              <span>Next: {s.next_sync_at ? new Date(s.next_sync_at).toLocaleString() : "—"}</span>
                            </div>

                            {s.error ? (
                              <p className="mt-2 text-xs text-red-600">Error: {s.error}</p>
                            ) : null}

                            <div className="mt-3 flex flex-wrap gap-2">
                              <RetrySyncButton sourceId={s.id} variant="outline" size="sm" />
                              {s.kind === "email" ? (
                                <ShowEmailAliasButton
                                  currentAlias={s.config?.alias || null}
                                  buttonVariant="outline"
                                  buttonSize="sm"
                                />
                              ) : null}
                              <Link
                                href="#"
                                className="ml-auto rounded-lg border border-[#ECECF2] px-3 py-1.5 text-xs font-medium text-[#444] hover:bg-[#F8F8FC]"
                              >
                                View integration
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {tab === "team" && (
                <>
                  <h2 className="mb-3 text-base font-semibold text-[#222]">Team</h2>
                  <div className="rounded-2xl border border-[#ECECF2] bg-white p-4">
                    <MembersManager />
                  </div>
                </>
              )}

              {/* Simple placeholders for other tabs (wire up later) */}
              {["mydetails", "profile", "password", "notifications"].includes(tab) && (
                <div className="rounded-2xl border border-[#ECECF2] bg-white p-6">
                  <p className="text-sm text-[#6b6b76]">
                    The <span className="font-medium capitalize">{tab}</span> panel will appear here.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function describeSource(kind: string) {
  switch (kind) {
    case "google":
      return "Ingest Google reviews and ratings.";
    case "yelp":
      return "Sync Yelp reviews and business feedback.";
    case "twitter":
      return "Monitor brand mentions from X (Twitter).";
    case "email":
      return "Forward customer emails into Rynith.";
    default:
      return "Connect and automate this source with Rynith.";
  }
}
