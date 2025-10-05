// components/WhispererFeatures.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";


type Item = {
  key: string;
  label: string;      // left pills
  title: string;      // right h3
  body: string;       // right body
  imageSrc: string;   // middle image
  imageAlt?: string;
};

type DataShape = {
  heading?: string;                          // H1
  cta?: { label: string; href: string } | null;
  initialKey?: string;
  items: Item[];
};

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShow(true)),
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={
        "transition duration-700 ease-out will-change-transform " +
        (show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")
      }
    >
      {children}
    </div>
  );
}

const FALLBACK: DataShape = {
  heading: "Advanced AI features for smarter automation",
  cta: { label: "Get started now", href: "/demo" },
  initialKey: "summaries",
  items: [
    {
      key: "summaries",
      label: "AI-Powered Insights",
      title: "Instant summaries your team can trust",
      body:
        "Rynith distills long conversations into crisp, actionable notes—tone, intent, and next steps—so agents jump in with context.",
      imageSrc: "/dashboard4.png",
    },
  ],
};

export default function WhispererFeatures({
  id = "features",
  src = "/data/whisperer-features.json",
}: {
  id?: string;
  src?: string;
}) {
  const [data, setData] = useState<DataShape | null>(null);
  const [loading, setL] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch JSON (optional)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setL(true);
        setError(null);
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load ${src} (${res.status})`);
        const json = (await res.json()) as DataShape;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load features");
      } finally {
        if (!cancelled) setL(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  const merged: DataShape = {
    heading: data?.heading ?? FALLBACK.heading,
    cta: data?.cta ?? FALLBACK.cta,
    initialKey: data?.initialKey ?? FALLBACK.initialKey,
    items: data?.items?.length ? data.items : FALLBACK.items,
  };

  const [activeKey, setActiveKey] = useState<string>(
    merged.initialKey || merged.items[0]?.key
  );

  // keep active key valid when JSON arrives
  useEffect(() => {
    if (!merged.items.find((i) => i.key === activeKey)) {
      setActiveKey(merged.initialKey || merged.items[0]?.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const active = merged.items.find((i) => i.key === activeKey) ?? merged.items[0];

  return (
    <section id={id} className="py-14 sm:py-16">
      <style>{`
        @keyframes wf_card { from { opacity:.25; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
        @keyframes wf_img  { from { opacity:.15; transform: scale(0.985) } to { opacity:1; transform: scale(1) } }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {loading && (
          <div className="mb-3 text-sm text-[var(--muted,#6b7280)]">
            Loading features…
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-[var(--border,#e5e7eb)] bg-white p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Heading + CTA */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Reveal>
            <h2 className="text-2xl font-semibold sm:text-4xl">
              {merged.heading}
            </h2>
          </Reveal>
          {merged.cta && (
            <Reveal delay={120}>
              <Link
                href="/demo" // force /demo
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom,#6A0DAD)] to-[var(--primaryTo,#8B4AD7)] px-5 py-3 text-sm font-semibold text-white shadow hover:shadow-md"
              >
                {merged.cta.label}
              </Link>
            </Reveal>
          )}
        </div>

        {/* Content card */}
        <div className="mt-6 rounded-2xl border border-[var(--border,#e5e7eb)] bg-white p-4 sm:p-6 animate-[wf_card_.35s_ease]">
          {/* Mobile-first: stack layout; at md+ switch to 3 columns */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(220px,260px)_minmax(280px,40%)_1fr] md:items-stretch">
            {/* 1) Pills (mobile: horizontal scroll) */}
            <aside className="rounded-xl border border-[var(--border,#e5e7eb)] bg-[var(--surface,#fafafa)] md:bg-white p-2 sm:p-3 md:p-4">
                  {/* Mobile pill scroller with arrows */}
                  <MobilePillScroller
                    items={merged.items}
                    activeKey={activeKey}
                    onSelect={setActiveKey}
                  />

                  {/* Desktop/Tablet vertical menu */}
                  <div className="hidden md:block space-y-3">
                    {merged.items.map((it) => {
                      const isActive = it.key === activeKey;
                      return (
                        <button
                          key={it.key}
                          onClick={() => setActiveKey(it.key)}
                          className={
                            "w-full rounded-lg border px-4 py-3 text-left text-sm font-medium outline-none transition focus:ring-2 focus:ring-[var(--primaryTo,#8B4AD7)]/40 " +
                            (isActive
                              ? "border-transparent bg-gradient-to-r from-[var(--primaryFrom,#6A0DAD)] to-[var(--primaryTo,#8B4AD7)] text-white shadow"
                              : "border-[var(--border,#e5e7eb)] bg-white text-[var(--text,#0f172a)] hover:bg-[var(--surfaceAccent,#f6f6fb)]")
                          }
                          aria-pressed={isActive}
                        >
                          {it.label}
                        </button>
                      );
                    })}
                  </div>
             </aside>


            {/* 2) Image */}
            <div className="rounded-xl border border-[var(--border,#e5e7eb)] overflow-hidden h-[260px] sm:h-[320px] md:h-auto">
              {active && (
                <img
                  key={active.key + ":img"}
                  src={active.imageSrc}
                  alt={active.imageAlt ?? active.title}
                  className="h-full w-full animate-[wf_img_.35s_ease] object-cover md:object-contain"
                />
              )}
            </div>

            {/* 3) Text */}
            <div className="flex flex-col justify-center px-1 sm:px-2">
              {active && (
                <>
                  <h3
                    key={active.key + ":h"}
                    className="text-xl font-semibold sm:text-2xl/tight"
                  >
                    {active.title}
                  </h3>
                  <p
                    key={active.key + ":p"}
                    className="mt-3 text-sm text-[var(--muted,#6b7280)]"
                  >
                    {active.body}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
function MobilePillScroller({
  items,
  activeKey,
  onSelect,
}: {
  items: { key: string; label: string }[];
  activeKey: string;
  onSelect: (k: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(max - el.scrollLeft <= 2);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (dx: number) => {
    ref.current?.scrollBy({ left: dx, behavior: "smooth" });
  };

  return (
    <div className="relative md:hidden -mx-2">
      {/* left gradient + arrow */}
      {!atStart && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 h-full w-8 bg-gradient-to-r from-white to-transparent" />
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollBy(-160)}
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow ring-1 ring-black/10 p-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-700">
              <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* right gradient + arrow */}
      {!atEnd && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent" />
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollBy(160)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow ring-1 ring-black/10 p-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" className="text-gray-700">
              <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* the scroller */}
      <div
        ref={ref}
        className="overflow-x-auto pb-1 px-2 scroll-smooth no-scrollbar"
        onScroll={updateArrows}
      >
        <div className="flex min-w-full gap-2">
          {items.map((it) => {
            const active = it.key === activeKey;
            return (
              <button
                key={it.key}
                onClick={() => onSelect(it.key)}
                className={
                  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ring-1 transition focus:outline-none focus:ring-2 focus:ring-[var(--primaryTo,#8B4AD7)]/40 " +
                  (active
                    ? "bg-gradient-to-r from-[var(--primaryFrom,#6A0DAD)] to-[var(--primaryTo,#8B4AD7)] text-white ring-transparent shadow"
                    : "bg-white text-[var(--text,#0f172a)] ring-[var(--border,#e5e7eb)] hover:bg-[var(--surfaceAccent,#f6f6fb)]")
                }
                aria-pressed={active}
              >
                {it.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
