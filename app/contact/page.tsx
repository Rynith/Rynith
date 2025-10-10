// app/contact/page.tsx
"use client";

import { useState } from "react";
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
    <main
      className="relative min-h-[92vh]"
      style={{
        background:
          "linear-gradient(180deg, var(--bg-soft) 0%, var(--bg) 100%)",
      }}
    >
      {/* BRAND SOFT GLOW */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-[36px]"
        style={{
          background: "var(--primary)",
          opacity: 0.12,
          filter: "blur(48px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-10 h-56 w-56 rounded-full"
        style={{
          background: "var(--primary-to)",
          opacity: 0.12,
          filter: "blur(44px)",
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/logos/rynith-logo.png" alt="Rynith" className="h-7 w-auto" />
            <span className="text-lg font-semibold" style={{ color: "var(--text)" }}>
              Rynith
            </span>
          </div>
          <Link
            href="/"
            className="text-sm font-medium"
            style={{ color: "var(--text)", opacity: 0.85 }}
          >
            Back to Home →
          </Link>
        </div>

        {/* Main Card */}
        <div
          className="grid gap-8 rounded-2xl p-4 sm:p-6 lg:grid-cols-2"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          {/* LEFT: FORM */}
          <section
            className="rounded-2xl p-6 sm:p-7"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <h1 className="text-3xl font-semibold" style={{ color: "var(--text)" }}>
              Let’s talk
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text)", opacity: 0.65 }}>
              Tell us what you’re building or the challenges you want to solve. We’ll get back
              within 1 business day.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
                <Field label="Full name">
                  <Input name="name" required />
                </Field>
                <Field label="Email">
                  <Input type="email" name="email" required />
                </Field>
              </div>

              <Field label="Company">
                <Input name="company" />
              </Field>

              <Field label="Message">
                <Textarea
                  name="message"
                  rows={6}
                  placeholder="What would you like to cover? Problems, goals, timelines."
                />
              </Field>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text)", opacity: 0.7 }}>
                  <input
                    type="checkbox"
                    required
                    className="h-4 w-4 rounded"
                    style={{
                      accentColor: "var(--primary)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  I accept the Terms & Privacy.
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold color: var(--text) transition"
                  style={{
                    background: "linear-gradient(90deg, var(--primary), var(--primary-to))",
                    boxShadow: "0 10px 24px rgba(103,77,249,.22)",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Sending…" : "Send message"}
                </button>
              </div>

              {msg && (
                <p
                  className="mt-3 text-sm border rounded-lg px-3 py-2"
                  style={
                    /thanks/i.test(msg)
                      ? {
                          color: "#166534",
                          background: "#ECFDF5",
                          borderColor: "#A7F3D0",
                        }
                      : {
                          color: "#991B1B",
                          background: "#FEF2F2",
                          borderColor: "#FECACA",
                        }
                  }
                >
                  {msg}
                </p>
              )}
            </form>
          </section>

          {/* RIGHT: BRAND / HIGHLIGHTS */}
          <aside
            className="relative overflow-hidden rounded-2xl"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {/* Brand Panel */}
            <div
              className="m-6 rounded-2xl p-5 var(--text)"
              style={{
                background: "linear-gradient(90deg, var(--primary), var(--primary-to))",
              }}
            >
              <p className="text-sm font-semibold">Rynith makes feedback actionable</p>
              <p className="mt-1 text-xs/5 opacity-95">
                Turn reviews and messages into summaries, alerts, and playbooks your team can act on.
              </p>
              <div className="mt-3 text-xs space-y-1 opacity-95">
                <div>✉︎ hello@rynith.com</div>
                <div>🕑 Mon–Fri, 9am–6pm</div>
              </div>
            </div>

            <div className="px-6 pb-6 grid gap-5">
              {/* Setup chips */}
              <div
                className="rounded-xl p-4 shadow-sm"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                  Checklist setup
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Chip>Connect sources</Chip>
                  <Chip>Enable alerts</Chip>
                  <Chip>Invite team</Chip>
                </div>
              </div>

              {/* Bars */}
              <div
                className="rounded-xl p-4 shadow-sm"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm font-medium mb-2" style={{ color: "var(--text)" }}>
                  Weekly insights
                </p>
                <div className="flex items-end gap-2 h-24">
                  {[36, 50, 44, 68, 72, 66, 80].map((h, i) => (
                    <div
                      key={i}
                      className="w-4 rounded-t"
                      style={{
                        height: `${h}%`,
                        background: "linear-gradient(180deg, var(--primary-to), var(--primary))",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* KPI */}
              <div
                className="rounded-xl p-4 shadow-sm flex items-center justify-between"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                    Avg response time
                  </p>
                  <p className="text-2xl font-semibold mt-1" style={{ color: "var(--text)" }}>
                    3m 12s
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    color: "#B45309", // amber-700
                    background: "#FEF3C7", // amber-100
                  }}
                >
                  -18% this week
                </span>
              </div>
            </div>
          </aside>
        </div>

        {/* Footer helper */}
        <p className="mt-6 text-center text-sm" style={{ color: "var(--text)", opacity: 0.7 }}>
          Prefer a quick chat?{" "}
          <Link href="/demo" className="font-medium" style={{ color: "var(--primary)" }}>
            Book a demo
          </Link>
        </p>
      </div>
    </main>
  );
}

/* ---- helpers (styled with CSS vars) ---- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1" style={{ color: "var(--text)", opacity: 0.7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl px-3 py-2 text-sm outline-none transition"
      style={{
        background: "var(--card)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.02) inset",
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(103,77,249,.25)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "0 1px 0 rgba(0,0,0,0.02) inset")}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl px-3 py-2 text-sm outline-none transition"
      style={{
        background: "var(--card)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        boxShadow: "0 1px 0 rgba(0,0,0,0.02) inset",
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(103,77,249,.25)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "0 1px 0 rgba(0,0,0,0.02) inset")}
    />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-full px-3 py-1.5 text-xs"
      style={{
        color: "var(--text)",
        opacity: 0.9,
        background: "var(--bg-soft)",
        border: "1px solid var(--border)",
      }}
    >
      {children}
    </div>
  );
}

