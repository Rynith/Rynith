// app/contact/page.tsx
"use client";

import { useState } from "react";
import Script from "next/script";
import Link from "next/link";

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    // Honeypot
    if (honeypot.trim()) {
      setMsg("Thanks! We’ll get back to you shortly.");
      (e.currentTarget as HTMLFormElement).reset();
      setSubmitting(false);
      return;
    }

    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: "Failed to submit" }));
        throw new Error(error || `Request failed: ${res.status}`);
      }
      setMsg("Thanks! We’ll get back to you shortly.");
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err: any) {
      setMsg(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[92vh] overflow-hidden bg-[linear-gradient(180deg,#faf8ff,white)]">
      {/* Decorative background blobs (inspired by the reference) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-3xl rotate-12 bg-[#8B4AD7] opacity-20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-10 h-64 w-64 rounded-full bg-[#FFB020] opacity-20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 bottom-10 h-56 w-56 rounded-3xl -rotate-12 bg-[#1FB6FF] opacity-20 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-10 bottom-16 h-80 w-80 rounded-[40px] bg-[#F472B6] opacity-20 blur-2xl"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/assets/logos/rynith-logo.png"
              alt="Rynith"
              className="h-7 w-auto"
            />
            <span className="text-lg font-semibold">Rynith</span>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-gray-900] hover:text-[#6A0DAD]"
          >
            Back to Home →
          </Link>
        </div>

        {/* Card */}
        <div className="grid gap-8 rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-4 sm:p-6 lg:grid-cols-2">
          {/* LEFT: Form */}
          <section className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-5 sm:p-7">
            <h1 className="text-3xl font-semibold mb-1">Let’s talk</h1>
            <p className="text-sm text-gray-900 mb-6">
              Tell us what you’re building or the challenges you want to solve.
              We’ll get back within 1 business day.
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Honeypot */}
              <input
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Full name
                  </label>
                  <input
                    required
                    name="name"
                    className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    name="email"
                    className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Company
                </label>
                <input
                  name="company"
                  className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Message
                </label>
                <textarea
                  name="message"
                  rows={6}
                  placeholder="What would you like to cover? Problems, goals, timelines."
                  className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    required
                    className="rounded border-gray-300 text-[#6A0DAD] focus:ring-[#6A0DAD]"
                  />
                  I accept the Terms & Privacy.
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-60 bg-gradient-to-r from-[#6A0DAD] to-[#8B4AD7]"
                >
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </div>

              {msg && (
                <p
                  className={`mt-3 text-sm ${
                    /thanks/i.test(msg)
                      ? "text-green-700 bg-green-50 border-green-200"
                      : "text-red-700 bg-red-50 border-red-200"
                  } border rounded-lg px-3 py-2`}
                >
                  {msg}
                </p>
              )}
            </form>
          </section>

          {/* RIGHT: Info / Highlights */}
          <aside className="relative overflow-hidden rounded-2xl border border-[var(--border,#e5e7eb)] bg-white">
            {/* blue panel */}
            <div className="absolute right-6 top-6 rounded-2xl bg-[#1FB6FF] text-white px-5 py-4 shadow-md">
              <p className="text-sm font-semibold">
                Simple tech, powerful outcomes
              </p>
              <p className="mt-1 text-xs/5 opacity-90">
                We turn raw feedback into actions—summaries, alerts, and
                playbooks that lift CSAT.
              </p>
              <div className="mt-3 text-xs space-y-1 opacity-90">
                <div>✉︎ hello@rynith.com</div>
                <div>🕑 Mon–Fri, 9am–6pm</div>
              </div>
            </div>

            {/* preview widgets */}
            <div className="p-6 grid gap-5">
              <div className="rounded-xl border border-[var(--border,#e5e7eb)] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium">Checklist setup</p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg border p-3">Connect sources</div>
                  <div className="rounded-lg border p-3">Enable alerts</div>
                  <div className="rounded-lg border p-3">Invite team</div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border,#e5e7eb)] bg-white p-4 shadow-sm">
                <p className="text-sm font-medium mb-2">Weekly insights</p>
                <div className="flex items-end gap-2 h-24">
                  {[36, 50, 44, 68, 72, 66, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-4 rounded-t bg-gradient-to-b from-[#8B4AD7] to-[#6A0DAD]"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[var(--border,#e5e7eb)] bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Avg response time</p>
                  <p className="text-2xl font-semibold mt-1">3m 12s</p>
                </div>
                <div className="rounded-full bg-[#FFB020]/15 text-[#FFB020] px-3 py-1 text-xs font-medium">
                  -18% this week
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer helper (matches your footer link) */}
        <p className="mt-6 text-center text-sm text-gray-900">
          Prefer a quick chat?{" "}
          <Link
            href="/demo"
            className="font-medium text-[#6A0DAD] hover:underline"
          >
            Book a demo
          </Link>
        </p>
      </div>
    </main>
  );
}
