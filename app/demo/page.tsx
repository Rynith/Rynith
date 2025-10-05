// app/demo/page.tsx
"use client";

import Script from "next/script";
import { useState } from "react";

export default function DemoPage() {
  const url =
    process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/rynith-services/30min";

  // (Optional) light client-side validation for the form
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  setSubmitting(true);
  setMsg(null);

  try {
    // Collect form values once
    const fd = new FormData(e.currentTarget);

    // Honeypot (add <input name="website" className="hidden" tabIndex={-1} autoComplete="off" /> to your form)
    const honeypot = String(fd.get("website") ?? "").trim();
    if (honeypot) {
      // Silently succeed to fool bots
      setMsg("Thanks! We’ll get back to you shortly.");
      (e.currentTarget as HTMLFormElement).reset();
      return;
    }

    const payload = Object.fromEntries(fd.entries());

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to submit" }));
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf8ff,white)]">
      {/* Calendly script */}
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            Let’s Build with{" "}
            <span className="text-[#6A0DAD] underline decoration-4 decoration-[#6A0DAD]/25 underline-offset-4">
              Clarity
            </span>{" "}
            &amp; Momentum
          </h1>
          <p className="mt-2 text-sm text-gray-600 ]">
            Need strategic support? From customer insights to automation, let’s
            talk.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT: Calendar card */}
            <section className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white">
              <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border,#e5e7eb)]">
                <div>
                  <h2 className="text-lg font-medium">Reservation Page</h2>
                  <p className="mt-0.5 text-xs text-gray-600 ]">
                    30 min
                  </p>
                </div>
                <a
                  href={url}
                  className="text-xs font-medium text-[#6A0DAD] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book Free Call →
                </a>
              </header>

              <div className="calendly-inline-widget"
                   data-url={url}
                   style={{ minWidth: "320px", height: "680px" }} />

              <footer className="px-5 py-3 border-t border-[var(--border,#e5e7eb)] text-xs text-gray-600 ">
                Time zone auto-detects based on your browser.
              </footer>
            </section>

            {/* RIGHT: Contact form card */}
            <section className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-5 sm:p-6">
              <h3 className="text-xl font-semibold mb-4">
                Tell us a bit about you
              </h3>

              <form onSubmit={onSubmit} className="space-y-4">
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
                <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />


                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Message or inquiry
                  </label>
                  <textarea
                    name="message"
                    rows={5}
                    className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
                    placeholder="What would you like to cover on the call?"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    required
                    className="rounded border-gray-300 text-[#6A0DAD] focus:ring-[#6A0DAD]"
                  />
                  I have read and accept the Terms &amp; Conditions
                </label>

                {msg && (
                  <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {msg}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    disabled={submitting}
                    className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-60 bg-gradient-to-r from-[var(--primaryFrom,#6A0DAD)] to-[var(--primaryTo,#8b4ad7)]"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
