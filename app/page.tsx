'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from "react";
import type { CSSProperties } from 'react';
import Testimonial1 from '@/components/testimonials1';
import CommunityCTA1 from '@/components/communityCTA1';
import Pricing from '@/components/pricing';
import Industries from '@/components/industries';
import Benefits from '@/components/Benefits';
import WhispererFeatures from '@/components/whispererFeatures';
import { AnimatedDashboardCards } from "@/components/AnimatedDashboardCards"
import WhyTeamsLoveCards from "@/components/teamCards"
import CustomerInsightsFlow from "@/components/CustomerInsightsFlow";
import IntegrationOrbitSection from "@/components/IntegrationOrbitSection";
import FAQAccordion from "@/components/FAQAccordion";



const ASSETS = {
  logo: 'https://framerusercontent.com/images/z28AmvV9JSfqlsOMp3x2UoKqkI.svg',
  star: 'https://framerusercontent.com/images/c36j8ipdQiwrXr6ZpEDoo64rU.svg',
  // bg: 'https://framerusercontent.com/images/Y28bNIprVEz9Qy8OJJsq6ES10.jpg',
  heroA: 'https://framerusercontent.com/images/nvuXDeoXQ4KjgoW1Lnr0fcDSA2I.png',
  heroB: 'https://framerusercontent.com/images/T5F4WvPNF3dpx3XXRdWx2NV7SmA.png',
  logos: [
    'https://framerusercontent.com/images/bkdZupLD3Ud0Pl42qZPDXm7Tm8.svg',
    'https://framerusercontent.com/images/KqJnnWvgnuJfZ0hDp15OQPoJDf8.svg',
    'https://framerusercontent.com/images/UkhxHKaKmAY3UWAmVvpl0gxBkaY.svg',
    'https://framerusercontent.com/images/FUKzxHFLkeuz3mJp35hjOr7RVmg.svg',
    'https://framerusercontent.com/images/0TF5aDWibiLbkhKEJCmsnw9lNPQ.svg',
  ],
 
  stepImg: 'https://framerusercontent.com/images/tWRANEBxbqRm1HUopwBGBJPDSVU.png',
  tabImg: 'https://framerusercontent.com/images/BFX6XFvPvXFCfrc5VL7Pln3sRvQ.svg',
  avatar: 'https://framerusercontent.com/images/8N8k1p6qN9q8PkqQw8QmA3k2o.png',
};

// Small utility to animate sections on scroll (Framer-like reveal)
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setShow(true);
        });
      },
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
        'will-change-transform transition duration-700 ease-out ' +
        (show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6')
      }
    >
      {children}
    </div>
  );
}

export default function AilexLanding() {
  const [tab, setTab] = useState<'sentiment' | 'processing' | 'labeling' | 'classification'>('sentiment');
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] selection:bg-black/5">
      {/* CSS Variables + Keyframes */}
     <style>{`
      :root{--bg:#FAFAFA;--text:#1A1A1A;--muted:#666666;--surface:#FFFFFF;--surfaceAccent:#F3F0FF;--badge:#E9E5FC;--primaryFrom:#6A0DAD;--primaryTo:#7B3AED;--border:#EAEAEA}
      html{scroll-behavior:smooth}
      @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      @keyframes float {0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)}}
      @keyframes blob {0%{transform:translate(-10%,-10%) scale(1)}50%{transform:translate(0,0) scale(1.05)}100%{transform:translate(-10%,-10%) scale(1)}}
      /* ADD THIS */
      @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}
     </style>


      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-[var(--bg)]/80 backdrop-blur border-b border-[var(--border)]">
       
        
      </header>

      {/* HERO */}
     <section id="home" className="relative overflow-hidden">
        {/* subtle decorative blob */}
        <div className="pointer-events-none absolute -inset-x-40 -top-40 h-[420px] rounded-[999px] bg-gradient-to-r from-[var(--badge)] via-[var(--surfaceAccent)] to-white blur-3xl opacity-70 animate-[blob_18s_ease-in-out_infinite]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="max-w-3xl mx-auto text-center">
          <Reveal>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--badge)]/60 px-3 py-1 text-xs text-[var(--text)]/80">
          <img src={ASSETS.star} alt="star" className="h-3.5 w-3.5" />
          <span>4.7/5.0 on google.com</span>
          </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-4xl/tight sm:text-5xl/tight lg:text-6xl/tight font-semibold tracking-tight">
            <span className="block">Turn Customer Feedback into</span>
            <span className="block">Growth <span className="bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] bg-clip-text text-transparent">Fuel</span>.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
          <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-[var(--muted)]">
              Rynith analyzes your reviews from Google, Yelp, and more revealing trends, problems, and opportunities so you can act fast and grow smarter
          </p>
          </Reveal>
          <Reveal delay={240}>
          <div className="mt-8 flex items-center justify-center gap-3">
          <a
          href="#features"
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-5 py-3 text-sm font-semibold shadow transition hover:shadow-lg"
          >
          Start Free Trial
          </a>
          <a
          href="#pricing"
          className="inline-flex items-center rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surfaceAccent)]/60"
          >
          Book a Demo
          </a>
          </div>
          </Reveal>
          </div>


        {/* hero collage */}
           <AnimatedDashboardCards />
        </div>
        </section>

      {/* LOGOS MARQUEE */}
          <section className="py-10 border-t border-[var(--border)]">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Reveal>
            <p className="text-center text-sm text-[var(--text)]\">Helping businesses succeed worldwide</p>
            </Reveal>
            <div className="mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            <div className="flex animate-[marquee_20s_linear_infinite] gap-12 will-change-transform">
            {ASSETS.logos.concat(ASSETS.logos).map((src, i) => (
            <img key={i} src={src} alt="Client" className="h-8 w-auto opacity-90 [filter:brightness(0)]" />
            ))}
            </div>
            </div>
            </div>
        </section>


      {/* STEPS */}
      <section className="py-16 lg:py-24" id="features">
            <div className="max-w-5xl mx-auto text-center">
            <Reveal>
              <h1 className="text-4xl/tight sm:text-5xl/tight lg:text-6xl/tight font-semibold tracking-tight">
            <span className="block">Why Teams Love,</span>
            <span className="block"><span className="bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] bg-clip-text text-transparent">Rynith</span></span>
            </h1>
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
            <figure className="rounded-2xl bg-white p-6 sm:p-10 text-center">
              <blockquote className="text-lg sm:text-xl leading-relaxed">
                “It’s like having a customer feedback team working 24/7 — I finally know what to fix and what to double down on.”
              </blockquote>
              <figcaption className="mt-4 flex items-center justify-center gap-3 text-sm text-[var(--muted)]">
                <img src={ASSETS.avatar} alt="Avatar" className="h-8 w-8 rounded-full" />
                <span>Carlos Jonson, Founder & CEO</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* FEATURES TABS */}
      <section className="py-16">
        <WhispererFeatures src="/data/whisperer-features.json"/>
      </section>

      {/* INTEGRATIONS + METRICS */}
     <IntegrationOrbitSection />

    

      {/* BENEFITS */}
      <section className="py-16">
        <Benefits src="/data/benefits.json" />
      </section>

      {/* PRICING PREVIEW / CTA */}
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
     
      <section>  <Testimonial1 /> </section>
      <FAQAccordion />
      <section>  <CommunityCTA1 /> </section>



      {/* FOOTER */}
      <footer className="mt-16 border-t border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-sm text-[var(--muted)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={ASSETS.logo} alt="Rynith" className="h-6 w-auto" />
              <span>© {new Date().getFullYear()} Rynith. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[var(--primaryFrom)]">Privacy</a>
              <a href="#" className="hover:text-[var(--primaryFrom)]">Terms</a>
              <a href="#" className="hover:text-[var(--primaryFrom)]">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

