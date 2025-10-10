// components/CommunityCTA1.tsx
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type Props = {
  id?: string;
  title?: string;
  subtitle?: string;
  backgroundUrl?: string;
  features?: string[];
  onSubmit?: (email: string) => Promise<void> | void;
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

export default function CommunityCTA1({
  id = 'community',
  title = 'Turn feedback into fuel. Join the community.',
  subtitle = 'Weekly playbooks, templates, and beta invites. Turn customer feedback into action, cut handle time, and raise CSAT.',
  backgroundUrl,
  features = ['No credit card required', 'Early access & special offers'],
  onSubmit,
}: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(false);

    const good = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!good) {
      setErr('Please enter a valid email address.');
      return;
    }

    try {
      setBusy(true);
      if (onSubmit) await onSubmit(email.trim());
      setOk(true);
      setEmail('');
    } catch {
      setErr('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id={id} className="relative py-24">
      {/* Optional background image with gradient veil */}
      {backgroundUrl && (
        <>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-center bg-cover"
            style={{ backgroundImage: `url(${backgroundUrl})` }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-b from-black/30 via-black/30 to-black/40"
          />
        </>
      )}

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-3xl sm:text-5xl font-semibold text-[var(--ink-900)]">
            {title}
          </h2>
        </Reveal>

        <Reveal delay={120}>
          <p className="mt-4 text-base sm:text-lg text-[var(--ink-700)]">
            {subtitle}
          </p>
        </Reveal>

        <Reveal delay={200}>
          <form onSubmit={handleSubmit} className="mt-8 mx-auto flex max-w-2xl items-stretch gap-2">
            {/* Accessible label for screen readers */}
            <label htmlFor="cta-email" className="sr-only">Email address</label>
            <input
              id="cta-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!err}
              aria-describedby={err ? 'email-error' : undefined}
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--text)] placeholder-[var(--ink-500)] outline-none focus:ring-2 focus:ring-[var(--primary-to)]"
            />

            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="btn-primary-cool px-5 py-3"
            >
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </form>

          {!!err && (
            <p id="email-error" className="mt-2 text-sm text-[#B91C1C]">
              {err}
            </p>
          )}
          {ok && (
            <p className="mt-2 text-sm text-[#0F766E]">
              Thanks! Please check your inbox to confirm your subscription.
            </p>
          )}
        </Reveal>

        <Reveal delay={260}>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--ink-600)]">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--primary-to)]" />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
