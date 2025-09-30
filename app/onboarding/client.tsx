"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const RETAILER_OPTIONS = [
  { value: "fashion_apparel", label: "Fashion / Apparel" },
  { value: "electronics", label: "Electronics" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "beauty_wellness", label: "Beauty & Wellness" },
  { value: "services", label: "Professional Services" },
  { value: "other", label: "Other" },
];

export default function OnboardingClient() {
  const router = useRouter();
  const [industry, setIndustry] = React.useState<string>(RETAILER_OPTIONS[0].value);
  const [orgId, setOrgId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [connecting, setConnecting] = React.useState(false);
  const [alias, setAlias] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Ensure org + membership on first mount
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/org/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ensure: true }),
          cache: "no-store",
          credentials: "include",
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || `Ensure failed (${res.status})`);
        if (!cancelled) setOrgId(j.org_id ?? null);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to prepare workspace");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveRetailer() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/org/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ industry }),
        cache: "no-store",
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Save failed (${res.status})`);

      // success → go to dashboard
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save retailer type");
    } finally {
      setSaving(false);
    }
  }

  async function connectEmail() {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/sources/connect-email", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `Connect failed (${res.status})`);
      setAlias(j.alias ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to connect email ingestion");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Card className="bg-white border shadow">
      <CardHeader>
        <CardTitle>Get Set Up</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading && <p className="text-sm text-gray-500">Preparing your workspace…</p>}
        {error && (
          <p className="text-sm text-red-600 break-words">
            {error}
          </p>
        )}

        {/* Retailer type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">What kind of retailer are you?</label>
          <div className="flex gap-2">
            <Select
              value={industry}
              onValueChange={setIndustry}
              disabled={loading || saving}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {RETAILER_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={saveRetailer} disabled={loading || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* Email ingestion */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-800">Automatic collection (recommended)</label>
          <Button onClick={connectEmail} disabled={loading || connecting} className="w-full">
            {connecting ? "Connecting…" : "Connect Email Ingestion"}
          </Button>
          {alias && (
            <div className="mt-2 rounded border p-3 text-sm">
              <div className="font-medium">Forward reviews to:</div>
              <div className="mt-1 font-mono">{alias}</div>
              <div className="text-gray-600 mt-2">
                Add a mail rule in Gmail/Outlook to forward your “new review” notifications to this address.
              </div>
            </div>
          )}
        </div>

        {/* Continue */}
        <div className="pt-2">
          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")} disabled={loading}>
            Go to Dashboard
          </Button>
        </div>

        {/* Debug (visible only if something’s wrong) */}
        {!loading && !orgId && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            No organization yet. Click Save, or reload to retry ensuring your workspace.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
