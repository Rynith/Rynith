// components/WhispererFeatures.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Item = {
  key: string;
  label: string;          // button text (left column)
  title: string;          // h2 (right)
  body: string;           // subheading (right)
  imageSrc: string;       // image (middle column)
  imageAlt?: string;
};

type DataShape = {
  heading?: string;                          // H1
  cta?: { label: string; href: string }|null;// top-right button
  initialKey?: string;                       // default active
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={'transition duration-700 ease-out will-change-transform ' + (show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
    >
      {children}
    </div>
  );
}

const FALLBACK: DataShape = {
  heading: 'Advanced AI features for smarter automation',
  cta: { label: 'Get started now', href: '#cta' },
  initialKey: 'summaries',
  items: [
    {
      key: 'summaries',
      label: 'AI-Powered Insights',
      title: 'Instant summaries your team can trust',
      body: 'Customer Whisperer distills long conversations into crisp, actionable notes—tone, intent, and next steps—so agents jump in with context.',
      imageSrc: '/dashboard4.png'
    }
  ]
};

export default function WhispererFeatures({
  id = 'features',
  src = '/data/whisperer-features.json'   // JSON you’ll add in /public/data
}: { id?: string; src?: string }) {
  const [data, setData]   = useState<DataShape | null>(null);
  const [loading, setL]   = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setL(true);
        setError(null);
        // no-store so local edits show immediately
        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Failed to load ${src} (${res.status})`);
        const json = (await res.json()) as DataShape;
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Failed to load features');
      } finally {
        if (!cancelled) setL(false);
      }
    })();
    return () => { cancelled = true; };
  }, [src]);

  const merged: DataShape = {
    heading: data?.heading ?? FALLBACK.heading,
    cta: data?.cta ?? FALLBACK.cta,
    initialKey: data?.initialKey ?? FALLBACK.initialKey,
    items: data?.items?.length ? data.items : FALLBACK.items
  };

  const [activeKey, setActiveKey] = useState<string>(merged.initialKey || merged.items[0]?.key);
  useEffect(() => {
    // ensure active key stays valid when JSON loads
    if (!merged.items.find(i => i.key === activeKey)) {
      setActiveKey(merged.initialKey || merged.items[0]?.key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const active = merged.items.find(i => i.key === activeKey) ?? merged.items[0];

  return (
    <section id={id} className="py-16">
      <style>{`
        @keyframes wf_card { from { opacity:.25; transform: translateY(6px) } to { opacity:1; transform: translateY(0) } }
        @keyframes wf_img  { from { opacity:.15; transform: scale(0.985) } to { opacity:1; transform: scale(1) } }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {loading && <div className="text-sm text-[var(--muted)] mb-3">Loading features…</div>}
        {error && (
          <div className="mb-6 rounded-lg border border-[var(--border)] bg-white p-4 text-sm text-red-600">{error}</div>
        )}

        {/* H1 + CTA */}
        <div className="flex items-center justify-between gap-4">
          <Reveal>
            <h2 className="text-3xl sm:text-4xl font-semibold">{merged.heading}</h2>
          </Reveal>
          {merged.cta && (
            <Reveal delay={120}>
              <a
                href={merged.cta.href}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-5 py-3 text-sm font-semibold shadow hover:shadow-md"
              >
                {merged.cta.label}
              </a>
            </Reveal>
          )}
        </div>

        {/* Big framed area: [ buttons | image | text ] */}
        <div className="mt-8 rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-6 animate-[wf_card_.35s_ease] overflow-x-auto">
  {/* force 3 columns at all breakpoints; allow horizontal scroll on very small screens */}
  <div className="grid gap-6 grid-cols-[280px_minmax(320px,38%)_1fr] items-stretch min-w-[980px]">
    {/* 1) Buttons column */}
    <aside className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 h-full">
      <div className="space-y-3">
        {merged.items.map((it) => {
          const isActive = it.key === activeKey;
          return (
            <button
              key={it.key}
              onClick={() => setActiveKey(it.key)}
              className={
                'w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition ' +
                (isActive
                  ? 'border-transparent bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white shadow'
                  : 'border-[var(--border)] bg-white text-[var(--text)] hover:bg-[var(--surfaceAccent)]/60')
              }
              aria-pressed={isActive}
            >
              {it.label}
            </button>
          );
        })}
      </div>
    </aside>

    {/* 2) Image column */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden h-[350px]">
          {active && (
            <img
              key={active.key + ':img'}
              src={active.imageSrc}
              alt={active.imageAlt ?? active.title}
              className="w-full h-full object-cover animate-[wf_img_.35s_ease]"
            />
          )}
        </div>

        {/* 3) Text column */}
        <div className="flex flex-col justify-center h-full px-1 sm:px-2">
          {active && (
            <>
              <h3 key={active.key + ':h'} className="text-2xl/tight font-semibold">{active.title}</h3>
              <p key={active.key + ':p'} className="mt-3 text-sm text-[var(--muted)]">{active.body}</p>
            </>
          )}
        </div>
      </div>
    </div>

      </div>
    </section>
  );
}
