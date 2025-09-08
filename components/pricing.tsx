// components/Pricing.tsx
'use client';

import { useState } from 'react';

type PlanFree = {
  name?: string;
  trialNote?: string;
  features: string[];
  cta?: string;
};

type PlanPro = {
  name?: string;
  priceMonthly: number;          // base monthly price (e.g., 49)
  features: string[];
  cta?: string;
};

type Copy = {
  title?: string;
  monthlyLabel?: string;
  yearlyLabel?: string;
  yearlyBadge?: string;
};

type Props = {
  id?: string;
  free?: PlanFree;
  pro: PlanPro;
  currency?: string;             // e.g. "$"
  yearlyDiscount?: number;       // e.g. 0.10 for 10% off
  copy?: Copy;
};

export default function Pricing({
  id = 'pricing',
  currency = '$',
  yearlyDiscount = 0.10,
  free = {
    name: 'Free plan',
    trialNote: '1-month trial',
    features: [
      'AI-powered automation tools',
      'Up to 5,000 tasks/month',
      'Basic integrations',
      'Standard processing speed',
    ],
    cta: 'Get started',
  },
  pro,
  copy = {
    title: 'Simple & flexible pricing',
    monthlyLabel: 'Monthly',
    yearlyLabel: 'Yearly',
    yearlyBadge: '10% off',
  },
}: Props) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const formatUSD = (n: number) => `${currency}${n.toLocaleString()}`;
  const yearlyTotal = Math.round(pro.priceMonthly * 12 * (1 - yearlyDiscount));
  const approxMonthlyBilledAnnually = Math.round(pro.priceMonthly * (1 - yearlyDiscount));

  return (
    <section id={id} className="py-24 border-t border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-semibold text-center">
          {copy.title}
        </h2>

        {/* Billing toggle */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => setBilling('monthly')}
            className={`text-sm font-medium px-2 ${billing === 'monthly' ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}
          >
            {copy.monthlyLabel}
          </button>

          <button
            onClick={() => setBilling(billing === 'monthly' ? 'yearly' : 'monthly')}
            aria-label="Toggle billing period"
            className="relative h-6 w-11 rounded-full border border-[var(--border)] bg-white shadow-inner"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] transition-transform ${billing === 'monthly' ? 'left-0.5 translate-x-0' : 'left-0.5 translate-x-5'}`}
            />
          </button>

          <button
            onClick={() => setBilling('yearly')}
            className={`text-sm font-medium px-2 ${billing === 'yearly' ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}
          >
            {copy.yearlyLabel}{' '}
            <span className="ml-1 rounded-full bg-[var(--badge)] px-2 py-0.5 text-xs text-[var(--text)]">
              {copy.yearlyBadge}
            </span>
          </button>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-[var(--badge)] px-2.5 py-1 text-xs font-medium text-[var(--text)]/80">
                {free.name}
              </span>
            </div>
            <div className="mt-6 text-5xl font-semibold">
              {currency}0
              {free.trialNote && (
                <span className="ml-2 align-baseline text-sm font-normal text-[var(--muted)]">/ {free.trialNote}</span>
              )}
            </div>
            <a
              href="#cta"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text)] hover:bg-[var(--surfaceAccent)]/60"
            >
              {free.cta ?? 'Get started'}
            </a>
            <ul className="mt-6 grid gap-2 text-sm text-[var(--muted)]">
              {free.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-white p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] px-2.5 py-1 text-xs font-medium text-white">
                {pro.name ?? 'Premium Plan'}
              </span>
            </div>

            <div className="mt-6 flex items-end gap-2">
              <div className="text-5xl font-semibold">
                {billing === 'monthly' ? formatUSD(pro.priceMonthly) : formatUSD(yearlyTotal)}
              </div>
              <div className="pb-2 text-sm text-[var(--muted)]">
                {billing === 'monthly' ? '/ per month' : '/ per year'}
              </div>
            </div>

            {billing === 'yearly' && (
              <div className="mt-1 text-xs text-[var(--muted)]">
                ≈ {formatUSD(approxMonthlyBilledAnnually)} / mo billed annually
              </div>
            )}

            <a
              href="#cta"
              className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[var(--primaryFrom)] to-[var(--primaryTo)] px-4 py-3 text-sm font-semibold text-white shadow hover:shadow-md"
            >
              {pro.cta ?? 'Subscribe to pro'}
            </a>

            <ul className="mt-6 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
              {pro.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
