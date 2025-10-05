// components/Industries.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Item = { title: string; sub: string };
type CardSize = { w: number; h: number };
type DataShape = {
  title?: string;
  items?: Item[];
  cardImages?: [string, string, string];
  containerHeight?: number;
  stackTop?: number;
  cardSize?: CardSize;
  transforms?: [string, string, string];
};

type Props = {
  id?: string;
  /** Optional JSON source (e.g., "/data/industries.json"). If provided, the component fetches data from here. */
  src?: string;
  /** Manual overrides still work; these win over JSON values if both provided */
  title?: string;
  items?: Item[];
  cardImages?: [string, string, string];
  containerHeight?: number;
  stackTop?: number;
  cardSize?: CardSize;
  transforms?: [string, string, string];
};

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setShow(true)),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={
        'transition duration-700 ease-out will-change-transform ' +
        (show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')
      }
    >
      {children}
    </div>
  );
}

type FinalData = {
  title: string;
  items: Item[];
  cardImages: [string, string, string];
  containerHeight: number;
  stackTop: number;
  cardSize: CardSize;
  transforms: [string, string, string];
};

const DEFAULTS: FinalData = {
  title: 'AI-powered solutions for every industry',
  items: [
    {
      title: 'Customer support',
      sub: 'Summarize conversations, detect intent & sentiment, auto-route by urgency, and draft empathetic replies that lift CSAT.',
    },
    {
      title: 'E-commerce ops',
      sub: 'Auto-tag issues, surface product insights, and deflect repeats with smart macros and knowledge links.',
    },
    {
      title: 'Financial services',
      sub: 'Normalize data, flag anomalies, and escalate risk—with an auditable trail across channels.',
    },
    {
      title: 'Healthcare',
      sub: 'De-identify sensitive data, triage tickets, and enforce access controls for compliant, fast responses.',
    },
  ],
  cardImages: [
    '/industry1.png',
    '/industry2.png',
    '/industry3.png',
  ],
  containerHeight: 540,
  stackTop: 96,
  cardSize: { w: 200, h: 320 },
  transforms: [
    'translate(-20%, 0) translateX(-180px) rotate(-8deg)',
    'translate(10%, 0) rotate(-8deg)',
    'translate(-30%, 0) translateY(120px) rotate(10deg)',
  ],
};

export default function Industries(props: Props) {
  const [data, setData] = useState<DataShape | null>(null);
  const [loading, setLoading] = useState<boolean>(!!props.src);
  const [error, setError] = useState<string | null>(null);

  // Fetch JSON if src is provided (narrow first, then use the narrowed value)
  useEffect(() => {
    if (!props.src) return;
    const url = props.src; // ← narrow to definite string for this effect run
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(url, { signal: ctrl.signal, cache: 'force-cache' });
        if (!res.ok) throw new Error(`Failed to load ${url} (${res.status})`);
        const json = (await res.json()) as DataShape;
        setData(json);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [props.src]);

  // Merge priority: props > JSON > defaults
  const merged: FinalData = {
    title: props.title ?? data?.title ?? DEFAULTS.title,
    items: props.items ?? data?.items ?? DEFAULTS.items,
    cardImages: props.cardImages ?? data?.cardImages ?? DEFAULTS.cardImages,
    containerHeight: props.containerHeight ?? data?.containerHeight ?? DEFAULTS.containerHeight,
    stackTop: props.stackTop ?? data?.stackTop ?? DEFAULTS.stackTop,
    cardSize: props.cardSize ?? data?.cardSize ?? DEFAULTS.cardSize,
    transforms: props.transforms ?? data?.transforms ?? DEFAULTS.transforms,
  };

  return (
    <section id={props.id ?? 'industries'} className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Simple fallback if loading or error */}
        {loading && <div className="text-sm text-[var(--muted)]">Loading industries…</div>}
        {error && (
          <div className="mb-6 rounded-lg border border-[var(--border)] bg-white p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-2 items-start">
          {/* Left: Accordion */}
          <div>
            <Reveal>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[#6A0DAD]">
                {merged.title}
              </h2>
            </Reveal>

            <Accordion items={merged.items} />
          </div>

          {/* Right: Stacked, angled cards with staggered rise (uniform size, capped above heading) */}
          <StackedCards
            images={merged.cardImages}
            containerHeight={merged.containerHeight}
            stackTop={merged.stackTop}
            cardSize={merged.cardSize}
            transforms={merged.transforms}
          />
        </div>
      </div>
    </section>
  );
}

function Accordion({ items }: { items: Item[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <div className="mt-6 divide-y divide-[var(--border)] border border-[var(--border)] rounded-2xl bg-white">
      {items.map((it, idx) => (
        <div key={it.title} className="group">
          <button
            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
            className="w-full flex items-center justify-between gap-4 px-5 py-4"
          >
            <span className="text-base font-medium text-[#6A0DAD]">{it.title}</span>
            <svg
              viewBox="0 0 24 24"
              className={`h-5 w-5 transform transition-transform ${
                openIdx === idx ? 'rotate-90' : 'rotate-0'
              } text-[var(--muted)]`}
              aria-hidden="true"
            >
              <path
                d="M8 5l8 7-8 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div
            className={`px-5 pb-6 text-sm text-[var(--muted)] transition-[grid-template-rows] duration-500 ease-out grid ${
              openIdx === idx ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            } overflow-hidden`}
          >
            <div className="min-h-0">
              <p>{it.sub}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StackedCards({
  images,
  containerHeight,
  stackTop,
  cardSize,
  transforms,
}: {
  images: [string, string, string];
  containerHeight: number;
  stackTop: number;
  cardSize: CardSize;
  transforms: [string, string, string];
}) {
  return (
    <div className="relative" style={{ height: containerHeight }}>
      <div className="absolute inset-x-0" style={{ top: stackTop }}>
        <Reveal delay={80}>
          <img
            src="/industry1.png"
            alt="Industry card"
            className="absolute rounded-2xl border border-[var(--border)] object-cover z-30"
            style={{ width: cardSize.w, height: cardSize.h, left: '50%', transform: transforms[0] }}
          />
        </Reveal>
        <Reveal delay={200}>
          <img
            src="/industry2.png"
            alt="Industry card"
            className="absolute rounded-2xl border border-[var(--border)] object-cover z-20"
            style={{ width: cardSize.w, height: cardSize.h, left: '50%', transform: transforms[1] }}
          />
        </Reveal>
        <Reveal delay={320}>
          <img
            src="/industry3.png"
            alt="Industry card"
            className="absolute rounded-2xl border border-[var(--border)] object-cover z-10"
            style={{ width: cardSize.w, height: cardSize.h, left: '50%', transform: transforms[2] }}
          />
        </Reveal>
      </div>
    </div>
  );
}
