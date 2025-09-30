// components/StartProButton.tsx
"use client";

import { useState } from "react";

export default function StartProButton({
  plan = "monthly",
  className = "",
  children = "Start Pro",
}: {
  plan?: "monthly" | "annual";
  className?: string;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  async function start() {
    try {
      setBusy(true);
      const res = await fetch(`/api/billing/checkout?plan=${plan}`, {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || "Failed");
      // ⬇️ Go to Stripe Checkout
      window.location.href = data.url as string;
    } catch (e) {
      console.error(e);
      alert("Could not start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={start}
      disabled={busy}
      className={`px-3 py-1.5 border rounded ${busy ? "opacity-50" : ""} ${className}`}
    >
      {busy ? "Opening…" : children}
    </button>
  );
}
