// app/settings/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import RetrySyncButton from "@/app/settings/retrysyncbutton";
import ShowEmailAliasButton from "@/app/settings/showEmailAliasButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MembersManager from "./members-client";
import BillingCard from "./BillingCard";

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

export default async function SettingsPage() {
  // 🚫 BUG WAS HERE: you had `const supabase = supabaseServer();` (no await)
  const supabase = await supabaseServer();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  // Membership (use latest membership; avoid `.single()` loops)
  const { data: memRows, error: memErr } = await supabase
    .from("org_members")
    .select("org_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (memErr) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Settings</h1>
        <p className="text-red-600 mt-2">Failed to load membership: {memErr.message}</p>
      </div>
    );
  }

  const org_id = memRows?.[0]?.org_id as string | undefined;
  if (!org_id) redirect("/onboarding");

  // Sources
  const { data: sources, error: sErr } = await supabase
    .from("sources")
    .select("id, kind, display_name, status, last_sync_at, next_sync_at, error, config")
    .eq("org_id", org_id)
    .order("kind", { ascending: true });

  if (sErr) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-[#1A1A1A]">Settings</h1>
        <p className="text-red-600 mt-2">Failed to load sources: {sErr.message}</p>
      </div>
    );
  }

  const rows: SourceRow[] = (sources ?? []) as any[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Settings</h1>
          <p className="text-[#666]">Manage how your reviews are collected.</p>
        </div>

        <Card className="bg-white border shadow">
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!rows.length ? (
              <p className="text-sm text-gray-600">No sources connected yet.</p>
            ) : (
              rows.map((s) => (
                <div key={s.id} className="rounded border p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-[#1A1A1A]">
                      {s.display_name || s.kind.toUpperCase()}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        s.status === "connected"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : s.status === "error"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : s.status === "pending"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-gray-50 text-gray-700 border-gray-200"
                      }`}
                    >
                      {s.status || "unknown"}
                    </span>
                  </div>

                  <div className="text-sm text-[#666]">
                    {s.last_sync_at ? (
                      <>Last sync: {new Date(s.last_sync_at).toLocaleString()}</>
                    ) : (
                      <>Last sync: —</>
                    )}
                    {" • "}
                    {s.next_sync_at ? (
                      <>Next: {new Date(s.next_sync_at).toLocaleString()}</>
                    ) : (
                      <>Next: —</>
                    )}
                  </div>

                  {s.error ? <div className="text-sm text-red-600">Error: {s.error}</div> : null}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* your client components */}
                    <RetrySyncButton sourceId={s.id} variant="outline" size="sm" />
                    {s.kind === "email" ? (
                      <ShowEmailAliasButton
                        currentAlias={s.config?.alias || null}
                        buttonVariant="outline"
                        buttonSize="sm"
                      />
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Team management */}
        <div className="max-w-3xl mx-auto space-y-3">
          <h2 className="text-xl font-semibold">Team</h2>
          <MembersManager />
        </div>

        <BillingCard/>
      </div>
    </div>
  );
}
