"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OnboardingClient from "./client";


export default function OnboardingPage() {
  const [retailer, setRetailer] = useState<string>("fashion_apparel");
  const [alias, setAlias] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ensured, setEnsured] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 1) Ensure org exists on mount (server creates if missing)
  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/org/config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ensure: true }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "Failed to ensure org");
        }
        setEnsured(true);
      } catch (e: any) {
        setErr(e?.message || "Failed to ensure org");
      }
    })();
  }, []);

  // 2) Save retailer type (updates org.config.industry)
  async function saveRetailerType() {
    try {
      setSaving(true);
      setErr(null);
      const res = await fetch("/api/org/config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ industry: retailer }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to save retailer type");
      }
    } catch (e: any) {
      setErr(e?.message || "Failed to save retailer type");
    } finally {
      setSaving(false);
    }
  }

  // 3) Connect email ingestion (returns forwarding alias)
  async function connectEmail() {
    try {
      setConnecting(true);
      setErr(null);
      const res = await fetch("/api/sources/connect-email", { method: "POST" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed to connect email ingestion");
      }
      const data = await res.json();
      setAlias(data.alias ?? null);
    } catch (e: any) {
      setErr(e?.message || "Failed to connect email ingestion");
    } finally {
      setConnecting(false);
    }
  }

  async function uploadCsv(file: File, org_id: string) {
  const sign = await fetch('/api/upload/reviews/sign', { method: 'POST', body: JSON.stringify({ org_id, filename: file.name }) })
  const { signedUrl } = await sign.json()
  await fetch(signedUrl, { method: 'PUT', body: file })
  // call an ingest edge function to parse the saved file (optional)
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto p-6">
        
         <OnboardingClient />
      </div>

     
    </div>
  );
}
