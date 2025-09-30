"use client";

import { useMemo } from "react";
import { AlertsEmail } from "@/lib/emails/alerts";
import { WeeklyDigestEmail } from "@/lib/emails/digest";

export default function EmailPreviewPage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const mockAlerts = [
    { kind: "low_sentiment", severity: "warning" as const, message: "Average sentiment is negative today (-0.24) across 12 reviews." },
    { kind: "shipping_spike", severity: "warning" as const, message: "Shipping mentions spiked today: 9 vs 2.1/day (7-day avg)." },
  ];
  const mockMetrics = [
    { date: "2025-09-12", review_count: 21, avg_sentiment: 0.12 },
    { date: "2025-09-13", review_count: 18, avg_sentiment: -0.04 },
    { date: "2025-09-14", review_count: 26, avg_sentiment: 0.08 },
  ];
  const mockTop = [
    { body: "Waited 20 minutes and the coffee was cold.", sentiment_score: -0.72 },
    { body: "Shipping took two weeks and arrived damaged.", sentiment_score: -0.66 },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-10">
      <section className="border rounded-xl p-4">
        <h1 className="text-xl font-semibold mb-3">Daily Alerts (Preview)</h1>
        <div className="prose max-w-none">
          {/* Render the same markup the email route uses */}
          <AlertsEmail date={today} orgName="Acme Coffee" alerts={mockAlerts} />
        </div>
      </section>

      <section className="border rounded-xl p-4">
        <h1 className="text-xl font-semibold mb-3">Weekly Digest (Preview)</h1>
        <div className="prose max-w-none">
          <WeeklyDigestEmail orgName="Acme Coffee" metrics={mockMetrics} top={mockTop} />
        </div>
      </section>
    </div>
  );
}
