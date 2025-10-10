// app/demo/page.tsx
"use client";

import Script from "next/script";
import Head from "next/head";
import { useState } from "react";

export default function DemoPage() {
  const url =
    process.env.NEXT_PUBLIC_CALENDLY_URL ||
    "https://calendly.com/rynith-services/30min";

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setMsg(null);
    try {
      const fd = new FormData(e.currentTarget);
      const honeypot = String(fd.get("website") ?? "").trim();
      if (honeypot) {
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
    <main className="relative min-h-screen overflow-hidden">
      {/* Brandy background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 320px at 15% 10%, var(--indigo-50,#F4F2FF), transparent 60%), radial-gradient(900px 360px at 90% 0%, rgba(62,230,192,0.18), transparent 60%), radial-gradient(900px 360px at 10% 100%, rgba(254,200,75,0.18), transparent 60%)",
        }}
      />

      <Head>
        <link
          rel="stylesheet"
          href="https://assets.calendly.com/assets/external/widget.css"
        />
      </Head>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border,#e6e6f2)] bg-white/70 px-3 py-1 text-[11px] font-medium shadow-sm backdrop-blur">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--mint-500,#3EE6C0)]" />
            Book a live product walkthrough
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight">
            Let’s build with{" "}
            <span className="text-[var(--primary-600,#674df9)] underline decoration-[color:var(--primary-200,#DDD7FF)] decoration-4 underline-offset-4">
              clarity
            </span>{" "}
            & momentum
          </h1>

          <p className="mt-2 text-sm 
          ">
            Share a few details and grab time that works. We’ll tailor the demo to your stack.
          </p>

          {/* Fun chips */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[var(--mint-500,#3EE6C0)]/10 text-[var(--mint-700,#0b8f71)] px-3 py-1 border border-[var(--mint-500,#3EE6C0)]/30">
              Real-time insights
            </span>
            <span className="rounded-full bg-[var(--amber-500,#FEC84B)]/10 text-[var(--amber-700,#8a5b00)] px-3 py-1 border border-[var(--amber-500,#FEC84B)]/30">
              Playbooks & actions
            </span>
            <span className="rounded-full bg-[var(--coral-500,#FF7A7A)]/10 text-[var(--coral-700,#a42727)] px-3 py-1 border border-[var(--coral-500,#FF7A7A)]/30">
              Multi-source reviews
            </span>
          </div>
        </header>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border,#e6e6f2)] bg-white p-4 sm:p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* LEFT: Calendar card */}
            <section className="rounded-2xl border border-[var(--border,#e6e6f2)] bg-white overflow-hidden">
              <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border,#e6e6f2)]">
                <div>
                  <h2 className="text-lg font-medium">Reservation Page</h2>
                  <p className="mt-0.5 text-xs ">30 min</p>
                </div>
                <a
                  href={url}
                  className="text-xs font-semibold text-[var(--primary-600,#674df9)] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Book Free Call →
                </a>
              </header>

              {/* Calendly */}
              <div
                className="calendly-inline-widget"
                data-url={url}
                style={{ minWidth: "320px", height: "680px" }}
              />

              <footer className="px-5 py-3 border-t border-[var(--border,#e6e6f2)] text-xs text-[var(--muted,#5b6178)]">
                Time zone auto-detects based on your browser.
              </footer>
            </section>

            {/* RIGHT: Contact form card */}
            <section className="rounded-2xl border border-[var(--border,#e6e6f2)] bg-white p-5 sm:p-6">
              <h3 className="text-xl font-semibold mb-4">Tell us a bit about you</h3>

              <form onSubmit={onSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text,#1E1B4B)] mb-1">
                        Full name
                      </label>
                      <input
                        required
                        name="name"
                        autoComplete="name"
                        className="w-full rounded-xl border border-[var(--border,#e6e6f2)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300,#b4a7ff)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[var(--text,#1E1B4B)] mb-1">
                        Email
                      </label>
                      <input
                        required
                        type="email"
                        name="email"
                        autoComplete="email"
                        className="w-full rounded-xl border border-[var(--border,#e6e6f2)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300,#b4a7ff)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text,#1E1B4B)] mb-1">
                      Company
                    </label>
                    <input
                      name="company"
                      autoComplete="organization"
                      className="w-full rounded-xl border border-[var(--border,#e6e6f2)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300,#b4a7ff)]"
                    />
                  </div>

                  {/* Honeypot */}
                  <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />

                  <div>
                    <label className="block text-xs font-medium text-[var(--text,#1E1B4B)] mb-1">
                      Message or inquiry
                    </label>
                    <textarea
                      name="message"
                      rows={5}
                      placeholder="What would you like to cover on the call?"
                      className="w-full rounded-xl border border-[var(--border,#e6e6f2)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300,#b4a7ff)]"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[var(--text,#1E1B4B)]">
                    <input
                      type="checkbox"
                      required
                      className="rounded border-[var(--border,#e6e6f2)] text-[var(--primary-600,#674df9)] focus:ring-[var(--primary-500,#7c65fb)]"
                    />
                    I accept the Terms &amp; Conditions
                  </label>

                  {msg && (
                    <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      {msg}
                    </p>
                  )}

                  <div className="pt-1 flex items-center gap-3">
                    <button
                      disabled={submitting}
                      className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-60 bg-gradient-to-r from-[var(--primary-600,#674df9)] to-[var(--primary-500,#7c65fb)] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary-300,#b4a7ff)]"
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>

                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium border bg-[var(--mint-500,#3EE6C0)]/10 border-[var(--mint-500,#3EE6C0)]/30 text-[var(--mint-700,#0b8f71)]">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--mint-500,#3EE6C0)]" />
                      Fast reply (≤1 business day)
                    </span>
                  </div>
                    </form>


              {/* Fun mini KPI row */}
              <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                <Kpi
                  label="Avg. response time"
                  value="3m 12s"
                  pill="-18% this week"
                  pillColor="amber"
                />
                <Kpi
                  label="Demo → trial conversion"
                  value="32%"
                  pill="+6 pts"
                  pillColor="mint"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- tiny presentational helpers ---------- */

function LabeledInput({
  label,
  name,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--muted,#5b6178)] mb-1">
        {label}
      </label>
      <input
        required
        name={name}
        type={type}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-[var(--border,#e6e6f2)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300,#b4a7ff)]"
      />
    </div>
  );
}

function LabeledTextarea({
  label,
  name,
  rows = 4,
  placeholder,
}: {
  label: string;
  name: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-[var(--muted,#5b6178)] mb-1">
        {label}
      </label>
      <textarea
        name={name}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-xl border border-[var(--border,#e6e6f2)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary-300,#b4a7ff)]"
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  pill,
  pillColor = "mint",
}: {
  label: string;
  value: string;
  pill?: string;
  pillColor?: "mint" | "amber" | "coral";
}) {
  const map = {
    mint: {
      bg: "bg-[var(--mint-500,#3EE6C0)]/10",
      border: "border-[var(--mint-500,#3EE6C0)]/30",
      text: "text-[var(--mint-700,#0b8f71)]",
      dot: "bg-[var(--mint-500,#3EE6C0)]",
    },
    amber: {
      bg: "bg-[var(--amber-500,#FEC84B)]/10",
      border: "border-[var(--amber-500,#FEC84B)]/30",
      text: "text-[var(--amber-700,#8a5b00)]",
      dot: "bg-[var(--amber-500,#FEC84B)]",
    },
    coral: {
      bg: "bg-[var(--coral-500,#FF7A7A)]/10",
      border: "border-[var(--coral-500,#FF7A7A)]/30",
      text: "text-[var(--coral-700,#a42727)]",
      dot: "bg-[var(--coral-500,#FF7A7A)]",
    },
  }[pillColor];

  return (
    <div className="rounded-xl border border-[var(--border,#e6e6f2)] bg-white p-3">
      <div className="text-[11px] text-[var(--muted,#5b6178)]">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
      {pill && (
        <div
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 border ${map.bg} ${map.border} ${map.text}`}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${map.dot}`} />
          {pill}
        </div>
      )}
    </div>
  );
}

// // app/demo/page.tsx











// "use client";

// import Script from "next/script";
// import { useState } from "react";

// export default function DemoPage() {
//   const url =
//     process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/rynith-services/30min";

//   // (Optional) light client-side validation for the form
//   const [submitting, setSubmitting] = useState(false);
//   const [msg, setMsg] = useState<string | null>(null);

//   async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
//   e.preventDefault();
//   setSubmitting(true);
//   setMsg(null);

//   try {
//     // Collect form values once
//     const fd = new FormData(e.currentTarget);

//     // Honeypot (add <input name="website" className="hidden" tabIndex={-1} autoComplete="off" /> to your form)
//     const honeypot = String(fd.get("website") ?? "").trim();
//     if (honeypot) {
//       // Silently succeed to fool bots
//       setMsg("Thanks! We’ll get back to you shortly.");
//       (e.currentTarget as HTMLFormElement).reset();
//       return;
//     }

//     const payload = Object.fromEntries(fd.entries());

//     const res = await fetch("/api/contact", {
//       method: "POST",
//       headers: { "content-type": "application/json" },
//       body: JSON.stringify(payload),
//     });

//     if (!res.ok) {
//       const { error } = await res.json().catch(() => ({ error: "Failed to submit" }));
//       throw new Error(error || `Request failed: ${res.status}`);
//     }

//     setMsg("Thanks! We’ll get back to you shortly.");
//     (e.currentTarget as HTMLFormElement).reset();
//   } catch (err: any) {
//     setMsg(err?.message || "Something went wrong. Please try again.");
//   } finally {
//     setSubmitting(false);
//   }
// }

//   return (
//     <main className="min-h-screen bg-[linear-gradient(180deg,#faf8ff,white)]">
//       {/* Calendly script */}
//       <Script
//         src="https://assets.calendly.com/assets/external/widget.js"
//         strategy="afterInteractive"
//       />

//       <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
//         {/* Header */}
//         <div className="mb-8">
//           <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">
//             Let’s Build with{" "}
//             <span className="text-[#6A0DAD] underline decoration-4 decoration-[#6A0DAD]/25 underline-offset-4">
//               Clarity
//             </span>{" "}
//             &amp; Momentum
//           </h1>
//           <p className="mt-2 text-sm text-gray-600 ]">
//             Need strategic support? From customer insights to automation, let’s
//             talk.
//           </p>
//         </div>

//         {/* Card */}
//         <div className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-4 sm:p-6">
//           <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
//             {/* LEFT: Calendar card */}
//             <section className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white">
//               <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border,#e5e7eb)]">
//                 <div>
//                   <h2 className="text-lg font-medium">Reservation Page</h2>
//                   <p className="mt-0.5 text-xs text-gray-600 ]">
//                     30 min
//                   </p>
//                 </div>
//                 <a
//                   href={url}
//                   className="text-xs font-medium text-[#6A0DAD] hover:underline"
//                   target="_blank"
//                   rel="noopener noreferrer"
//                 >
//                   Book Free Call →
//                 </a>
//               </header>

//               <div className="calendly-inline-widget"
//                    data-url={url}
//                    style={{ minWidth: "320px", height: "680px" }} />

//               <footer className="px-5 py-3 border-t border-[var(--border,#e5e7eb)] text-xs text-gray-600 ">
//                 Time zone auto-detects based on your browser.
//               </footer>
//             </section>

//             {/* RIGHT: Contact form card */}
//             <section className="rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-5 sm:p-6">
//               <h3 className="text-xl font-semibold mb-4">
//                 Tell us a bit about you
//               </h3>

//               <form onSubmit={onSubmit} className="space-y-4">
//                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       Full name
//                     </label>
//                     <input
//                       required
//                       name="name"
//                       className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-600 mb-1">
//                       Email
//                     </label>
//                     <input
//                       required
//                       type="email"
//                       name="email"
//                       className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
//                     />
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-xs font-medium text-gray-600 mb-1">
//                     Company
//                   </label>
//                   <input
//                     name="company"
//                     className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
//                   />
//                 </div>
//                 <input name="website" className="hidden" tabIndex={-1} autoComplete="off" />


//                 <div>
//                   <label className="block text-xs font-medium text-gray-600 mb-1">
//                     Message or inquiry
//                   </label>
//                   <textarea
//                     name="message"
//                     rows={5}
//                     className="w-full rounded-xl border border-[var(--border,#e5e7eb)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0DAD]/30"
//                     placeholder="What would you like to cover on the call?"
//                   />
//                 </div>

//                 <label className="flex items-center gap-2 text-xs text-gray-600">
//                   <input
//                     type="checkbox"
//                     required
//                     className="rounded border-gray-300 text-[#6A0DAD] focus:ring-[#6A0DAD]"
//                   />
//                   I have read and accept the Terms &amp; Conditions
//                 </label>

//                 {msg && (
//                   <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
//                     {msg}
//                   </p>
//                 )}

//                 <div className="pt-2">
//                   <button
//                     disabled={submitting}
//                     className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white shadow hover:shadow-md disabled:opacity-60 bg-gradient-to-r from-[var(--primaryFrom,#6A0DAD)] to-[var(--primaryTo,#8b4ad7)]"
//                   >
//                     {submitting ? "Submitting..." : "Submit"}
//                   </button>
//                 </div>
//               </form>
//             </section>
//           </div>
//         </div>
//       </div>
//     </main>
//   );
// }
