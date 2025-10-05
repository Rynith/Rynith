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
  title = 'Turn feedback into fuel Join the community',
  subtitle = 'Weekly playbooks, templates, and beta invites to turn customer feedback into action,Cut handle time and raise CSAT.',
  backgroundUrl,
  features = ['No credit card is required', 'Early access & Special offers'],
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

    const good = /\S+@\S+\.\S+/.test(email);
    if (!good) {
      setErr('Please enter a valid email address');
      return;
    }

    try {
      setBusy(true);
      if (onSubmit) await onSubmit(email);
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
          <h2 className="text-3xl sm:text-5xl font-semibold">{title}</h2>
        </Reveal>
        <Reveal delay={120}>
          <p className="mt-4 text-[var(--muted)]">{subtitle}</p>
        </Reveal>

        <Reveal delay={200}>
          <form onSubmit={handleSubmit} className="mt-8 mx-auto flex max-w-2xl items-stretch gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!err}
              aria-describedby={err ? 'email-error' : undefined}
              placeholder="Enter your email"
              className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primaryTo)]"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] px-5 py-3 text-sm font-semibold text-white shadow transition hover:shadow-md disabled:opacity-70"
            >
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </form>
          {!!err && (
            <p id="email-error" className="mt-2 text-sm text-red-600">
              {err}
            </p>
          )}
          {ok && (
            <p className="mt-2 text-sm text-green-600">
              Thanks! Please check your inbox to confirm your subscription.
            </p>
          )}
        </Reveal>

        <Reveal delay={260}>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--muted)]">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--primaryTo)]" />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
