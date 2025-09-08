// components/Testimonials.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

export type Testimonial1 = {
  name: string;
  role: string;
  company: string;
  avatar: string;
  quote: string;
};

const DEFAULT_TESTIMONIALS: Testimonial1[] = [
  {
    name: 'Amelia Carter',
    role: 'Head of CX',
    company: 'ShopSwift',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    quote:
      'Customer Whisperer turned our support into a growth loop. Auto-summaries and intent tagging cut handle time by 32% in the first month.',
  },
  {
    name: 'Diego Martins',
    role: 'Support Ops Lead',
    company: 'Finlytics',
    avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    quote:
      'The classifier is scary good. We route tickets by urgency and product in real time—SLA breaches dropped to near zero.',
  },
  {
    name: 'Yara El-Sayed',
    role: 'Community Manager',
    company: 'LoopLabs',
    avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
    quote:
      'We plugged in our help center + Discord. Whisperer surfaces themes we were blind to and drafts empathetic replies that actually sound human.',
  },
  {
    name: 'Kenji Watanabe',
    role: 'Product Support',
    company: 'Nimbus AI',
    avatar: 'https://randomuser.me/api/portraits/men/65.jpg',
    quote:
      'Dashboards show sentiment and churn risks per feature. It’s the first tool our PMs open every morning.',
  },
];

// tiny local Reveal so the component is self-contained
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
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

export default function Testimonials1({
  items = DEFAULT_TESTIMONIALS,
  id = 'testimonials',
  title = 'What our customers want about us',
}: {
  items?: Testimonial1[];
  id?: string;
  title?: string;
}) {
  const [active, setActive] = useState(0);

  return (
    <section id={id} className="py-24 border-t border-[var(--border)]">
      {/* optional local styles (fade on quote swap) */}
      <style>{`
        @keyframes tFade { from { opacity: .3; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <h2 className="text-3xl sm:text-4xl font-semibold text-center">{title}</h2>
        </Reveal>

        {/* Avatar selector */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {items.map((t, i) => {
            const isActive = active === i;
            return (
              <button
                key={t.name}
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className="rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primaryTo)]"
                title={`${t.name} — ${t.role}`}
              >
                <span
                  className={
                    'inline-block rounded-full p-0.5 transition ' +
                    (isActive ? 'bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)]' : '')
                  }
                >
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className={
                      'h-12 w-12 rounded-full object-cover border border-[var(--border)] bg-white ' +
                      (isActive ? '' : 'grayscale opacity-70 hover:opacity-100')
                    }
                  />
                </span>
              </button>
            );
          })}
        </div>

        {/* Active testimonial */}
        <Reveal delay={120}>
          <figure className="mt-10 mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
            <blockquote key={active} className="text-lg sm:text-xl leading-relaxed animate-[tFade_.4s_ease]">
              “{items[active].quote}”
            </blockquote>
            <figcaption className="mt-5 flex items-center justify-center gap-3 text-sm text-[var(--muted)]">
              <img
                src={items[active].avatar}
                alt={items[active].name}
                className="h-8 w-8 rounded-full object-cover"
              />
              <span className="font-medium text-[var(--text)]">{items[active].name}</span>
              <span>
                • {items[active].role}, {items[active].company}
              </span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
