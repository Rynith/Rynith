"use client";

import { useEffect, useRef, useState, CSSProperties } from "react";
import Reveal from "@/components/Reveal"; // You can replace with your preferred animation wrapper

// List of your .png logos in public path or next/image static path
const LOGO_PATHS = [
  "/assets/logos/Google.png",
  "/assets/logos/Yelp.png",
  "/assets/logos/Reddit.png",
  "/assets/logos/Shopify.png",
  "/assets/logos/Whatsapp.png",
  "/assets/logos/Meta.png",
  "/assets/logos/Twitter.png",
  "/assets/logos/YouTube.png",
];

export default function IntegrationOrbit() {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const [orbitD, setOrbitD] = useState(560);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.offsetWidth || 560;
      const d = Math.max(360, Math.min(1000, w + 160));
      setOrbitD(d);
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);

    const onResize = () => compute();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const orbitStyle = (idx: number, total: number, radius: number): CSSProperties => {
    const angle = (idx / total) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return {
      left: "50%",
      top: "50%",
      transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
    };
  };

  return (
    <section className="py-24" id="integrations">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Orbit */}
          <div className="flex items-center justify-center">
            <div className="relative overflow-hidden" style={{ width: orbitD, height: orbitD / 3 }}>
              <div className="absolute left-1/2 top-0 -translate-x-1/2" style={{ width: orbitD, height: orbitD }}>
                <div className="absolute inset-0 animate-[orbitSpin_22s_linear_infinite]">
                  {LOGO_PATHS.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`Integration logo ${i + 1}`}
                      className="absolute h-10 w-10 rounded-md object-contain drop-shadow-md"
                      style={orbitStyle(i, LOGO_PATHS.length, orbitD / 2 - 20)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Headline below the orbit */}
          <div className="text-center max-w-2xl mx-auto -mt-12 sm:-mt-16">
            <Reveal>
              <h2 ref={titleRef} className="text-3xl sm:text-4xl font-semibold">
                Connect Every Channel into One Source of Truth
              </h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-3 text-[var(--muted)]">
                Google, Yelp, Reddit, WhatsApp, and more — Customer Whisperer unifies your reviews and feedback into
                one actionable dashboard.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <a
                href="#all-integrations"
                className="mt-6 inline-flex items-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] text-white px-5 py-3 text-sm font-semibold shadow"
              >
                View All Integrations
              </a>
            </Reveal>
          </div>
        </div>

        {/* Stats */}
        <dl className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            ["150K+", "Reviews analyzed monthly"],
            ["30+ Channels", "Connected to AI dashboard"],
            ["360° View", "Of customer sentiment"],
          ].map(([stat, label], i) => (
            <Reveal key={stat} delay={i * 160}>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surfaceAccent)] p-8">
                <dt className="text-sm text-[var(--muted)]">{stat}</dt>
                <dd className="text-2xl font-semibold">{label}</dd>
              </div>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
