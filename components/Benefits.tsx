// components/Benefits.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type BenefitItem = {
  title: string;
  body: string;
  icon?: string; // optional icon URL
};

type DataShape = {
  title?: string;
  items?: BenefitItem[];
  columns?: 2 | 3 | 4;
  variant?: 'accent' | 'white';
  iconSize?: number; // px
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

// Safe defaults if JSON is missing/unreachable
const FALLBACK: Required<DataShape> = {
  title: 'Benefits of Customer whisperer to your Brand',
  columns: 4,
  variant: 'accent',
  iconSize: 28,
  items: [
    {
      title: 'Automated Review Analysis',
      body:
        'We scan and analyze reviews from all major platforms using advanced AI, saving you hours of manual reading. Instantly surface what matters most from repeated complaints to unexpected praise all without lifting a finger.',
    },
    {
      title: 'Actionable Weekly Reports',
      body: 'Every week, get a tailored report in your inbox that highlights top themes, recurring issues, and customer sentiments plus smart, practical suggestions on what to improve next in your business.',
    },
    {
      title: 'Multi-Platform Integration',
      body: 'Effortlessly connect Google Reviews, Yelp, TripAdvisor, and more with a few clicks — no technical skills needed. We centralize your feedback into one clear view so nothing gets missed.',
    },
    {
      title: 'Grow with Real Feedback',
      body: 'Stop guessing and start growing. Understand exactly what your customers love, what they’re frustrated by, and what’s holding them back — and use those insights to make better business decisions, fast.',
    },
  ],
};

export default function Benefits({
  id = 'benefits',
  src = '/data/benefits.json',
}: {
  id?: string;
  /** Path to your JSON in /public (default: /data/benefits.json) */
  src?: string;
}) {
  const [data, setData] = useState<DataShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(src, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`Failed to load ${src} (${res.status})`);
        const json = (await res.json()) as DataShape;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load benefits data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src]);

  // Merge JSON with fallback
  const merged: Required<DataShape> = {
    title: data?.title ?? FALLBACK.title,
    items: data?.items?.length ? data.items : FALLBACK.items,
    columns: data?.columns ?? FALLBACK.columns,
    variant: data?.variant ?? FALLBACK.variant,
    iconSize: data?.iconSize ?? FALLBACK.iconSize,
  };

  // Tailwind grid classes (explicit so they aren’t purged)
  const gridCols =
    merged.columns === 4
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : merged.columns === 3
      ? 'sm:grid-cols-2 lg:grid-cols-3'
      : 'sm:grid-cols-2';

  const cardBg = merged.variant === 'accent' ? 'bg-[var(--surfaceAccent)]' : 'bg-white';

  return (
    <section id={id} className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Loading / error helpers (non-blocking) */}
        {loading && (
          <div className="mb-6 text-sm text-[var(--muted)]">Loading benefits…</div>
        )}
        {error && (
          <div className="mb-6 rounded-lg border border-[var(--border)] bg-white p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        <Reveal>
          <h2 className="text-2xl sm:text-3xl font-semibold">{merged.title}</h2>
        </Reveal>

        <div className={`mt-8 grid gap-6 ${gridCols}`}>
          {merged.items.map((b, i) => (
            <Reveal key={b.title} delay={i * 120}>
              <div className={`rounded-2xl border border-[var(--border)] ${cardBg} p-6`}>
                {b.icon ? (
                  <img
                    src={b.icon}
                    alt=""
                    className="rounded"
                    style={{ width: merged.iconSize, height: merged.iconSize }}
                  />
                ) : (
                  <span
                    className="inline-block rounded-full bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)]"
                    style={{ width: merged.iconSize, height: merged.iconSize }}
                    aria-hidden="true"
                  />
                )}
                <h3 className="mt-3 text-base font-semibold">{b.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted)]">{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}