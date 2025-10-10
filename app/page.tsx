'use client';

import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import Testimonial1 from '@/components/testimonials1';
import CommunityCTA1 from '@/components/communityCTA1';
import Pricing from '@/components/pricing';
import Industries from '@/components/industries';
import Benefits from '@/components/Benefits';
import WhispererFeatures from '@/components/whispererFeatures';
import { AnimatedDashboardCards } from "@/components/AnimatedDashboardCards";
import WhyTeamsLoveCards from "@/components/teamCards";
import CustomerInsightsFlow from "@/components/CustomerInsightsFlow";
import IntegrationOrbitSection from "@/components/IntegrationOrbitSection";
import FAQAccordion from "@/components/FAQAccordion";
import Link from "next/link";
import "@/styles/globals.css";

/* ---------- ErrorBoundary ---------- */
type EBProps = { children: ReactNode; fallback?: ReactNode };
type EBState = { hasError: boolean; error?: Error };

class ErrorBoundary extends React.Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Landing ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <main className="min-h-screen grid place-items-center bg-[var(--bg,#fff)] px-6">
            <div className="max-w-lg text-center">
              <h1 className="text-2xl font-semibold text-[var(--ink-900,#0f172a)]">Something went wrong</h1>
              <p className="mt-2 text-sm text-[var(--ink-600,#475569)]">
                The page failed to render. Please refresh or try again later.
              </p>
              <button
                onClick={() => location.reload()}
                className="mt-4 btn-primary"
              >
                Reload
              </button>
            </div>
          </main>
        )
      );
    }
    return this.props.children;
  }
}

/* ---------- Assets ---------- */
const ASSETS = {
  logo: '/assets/logos/rynith-logo.png',
  star: 'https://framerusercontent.com/images/c36j8ipdQiwrXr6ZpEDoo64rU.svg',
  logos: [
    'https://framerusercontent.com/images/bkdZupLD3Ud0Pl42qZPDXm7Tm8.svg',
    'https://framerusercontent.com/images/KqJnnWvgnuJfZ0hDp15OQPoJDf8.svg',
    'https://framerusercontent.com/images/UkhxHKaKmAY3UWAmVvpl0gxBkaY.svg',
    'https://framerusercontent.com/images/FUKzxHFLkeuz3mJp35hjOr7RVmg.svg',
    'https://framerusercontent.com/images/0TF5aDWibiLbkhKEJCmsnw9lNPQ.svg',
  ],
};

/* ---------- Reveal helper ---------- */
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.isIntersecting && setShow(true));
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={'will-change-transform transition duration-700 ease-out ' + (show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')}
    >
      {children}
    </div>
  );
}

/* ---------- Page ---------- */
export default function Landing() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--bg,#ffffff)] text-[var(--ink-800,#1e293b)] selection:bg-[color-mix(in_srgb,var(--primary)_18%,transparent)]">
        <style>{`
          html { scroll-behavior: smooth }
          @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%) } }
          @keyframes blob { 0%{transform:translate(-10%,-10%) scale(1)} 50%{transform:translate(0,0) scale(1.05)} 100%{transform:translate(-10%,-10%) scale(1)} }
        `}</style>

        {/* HERO */}
        <section id="home" className="relative overflow-hidden">
          {/* Light, airy gradient wash (only uses existing vars) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-x-40 -top-40 h-[460px] rounded-[999px] blur-3xl opacity-90 animate-[blob_18s_ease-in-out_infinite]"
            style={{
              background: `
                radial-gradient(800px 220px at 20% 20%, color-mix(in srgb, var(--primary) 12%, white) , transparent 60%),
                radial-gradient(700px 220px at 80% 10%,  color-mix(in srgb, var(--accent-mint) 16%, white), transparent 65%),
                radial-gradient(900px 220px at 50% -10%, color-mix(in srgb, var(--accent-amber) 22%, white), transparent 70%)
              `
            }}
          />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <Reveal>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border,#e6e6f2)] bg-[color-mix(in_srgb,var(--primary)_8%,white)] px-3 py-1 text-xs text-[var(--ink-700)]">
                  <img src={ASSETS.star} alt="star" className="h-3.5 w-3.5" />
                  <span>4.7/5.0 from early users</span>
                </div>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="text-4xl/tight sm:text-5xl/tight lg:text-6xl/tight font-semibold tracking-tight">
                  <span className="block">Turn Customer Feedback into</span>
                  <span className="block">
                    Growth{' '}
                    <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-to)] bg-clip-text text-transparent">
                      Fuel
                    </span>.
                  </span>
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-[var(--ink-600)]">
                  Rynith analyzes your reviews across Google, Yelp & email — surfacing trends, risks, and playbooks so you can act faster and grow smarter.
                </p>
              </Reveal>

              <Reveal delay={240}>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Link href="/demo" className="btn-primary">
                    Start Free Trial
                  </Link>
                  <Link
                    href="/demo"
                    className="btn-outline"
                  >
                    Book a Demo
                  </Link>
                </div>
              </Reveal>
            </div>

            <AnimatedDashboardCards />
          </div>
        </section>

        {/* LOGOS MARQUEE */}
        <section className="py-10 border-t border-[var(--border,#e6e6f2)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <p className="text-center text-sm text-[var(--ink-700)]">Helping businesses succeed worldwide</p>
            </Reveal>
            <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
              <div className="flex animate-[marquee_20s_linear_infinite] gap-12 will-change-transform">
                {ASSETS.logos.concat(ASSETS.logos).map((src, i) => (
                  <img key={i} src={src} alt="Client" className="h-8 w-auto opacity-90 [filter:grayscale(1)_contrast(.05)_brightness(.15)]" />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* WHY TEAMS LOVE */}
        <section className="py-16 lg:py-24" id="features">
          <div className="max-w-5xl mx-auto text-center">
            <Reveal>
              <h2 className="text-4xl/tight sm:text-5xl/tight font-semibold">
                Why Teams Love{' '}
                <span className="bg-gradient-to-r from-[var(--primary)] to-[var(--primary-to)] bg-clip-text text-transparent">
                  Rynith
                </span>
              </h2>
            </Reveal>
            <WhyTeamsLoveCards />
          </div>
        </section>

        {/* INDUSTRIES */}
        <section className="py-16" id="industries">
          <Industries src="/data/industries.json" />
        </section>

        <CustomerInsightsFlow />

        {/* TESTIMONIAL */}
        <section className="py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <figure className="rounded-2xl bg-white p-6 sm:p-10 text-center border border-[var(--border,#e6e6f2)]">
                <blockquote className="text-lg sm:text-xl leading-relaxed text-[var(--ink-800)]">
                  “It’s like having a customer feedback team working 24/7 — I finally know what to fix and what to double down on.”
                </blockquote>
                <figcaption className="mt-4 flex items-center justify-center gap-3 text-sm text-[var(--ink-600)]">
                  <img src="/ceo1.png" alt="Avatar" className="h-8 w-8 rounded-full" />
                  <span>Carlos Jonson, Founder & CEO</span>
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </section>

        {/* FEATURE TABS */}
        <section className="py-16">
          <WhispererFeatures src="/data/whisperer-features.json" />
        </section>

        {/* INTEGRATIONS */}
        <IntegrationOrbitSection />

        {/* BENEFITS */}
        <section className="py-16">
          <Benefits src="/data/benefits.json" />
        </section>

        {/* PRICING */}
        <section>
          <Pricing
            pro={{
              name: 'Pro',
              priceMonthly: 49,
              cta: 'Start Pro',
              features: [
                'Everything in Free',
                'Real-time intent & sentiment routing',
                'AI macros + reply suggestions',
                'Dashboards for CSAT, AHT, churn risk',
                'Priority support',
                'API & webhooks for custom workflows',
              ],
            }}
            free={{
              name: 'Free plan',
              trialNote: '1-month trial',
              cta: 'Get started',
              features: [
                'AI-powered summaries & tagging',
                'Up to 5,000 messages/month',
                'Basic channel integrations',
                'Standard processing speed',
              ],
            }}
            yearlyDiscount={0.10}
            copy={{
              title: 'Simple pricing for Rynith',
              monthlyLabel: 'Monthly',
              yearlyLabel: 'Yearly',
              yearlyBadge: '10% off',
            }}
          />
        </section>

        <section><Testimonial1 /></section>
        <FAQAccordion />
        <section><CommunityCTA1 /></section>

        {/* FOOTER */}
        <footer className="mt-16 border-t border-[var(--border,#e6e6f2)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-[var(--ink-700)]">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img src={ASSETS.logo} alt="Rynith" className="h-6 w-auto" />
                <span>© {new Date().getFullYear()} Rynith. All rights reserved.</span>
              </div>
              <div className="flex gap-6">
                <a href="#" className="hover:text-[var(--primary)]">Privacy</a>
                <a href="#" className="hover:text-[var(--primary)]">Terms</a>
                <a href="/contact" className="hover:text-[var(--primary)]">Contact</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
