import * as React from "react";
type Metric = { date: string; review_count: number; avg_sentiment: number };
type TopReview = { body: string; sentiment_score?: number };

export function WeeklyDigestEmail({ orgName, metrics, top }: { orgName: string; metrics: Metric[]; top: TopReview[] }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#111" }}>
      <h2>Weekly Digest — {orgName}</h2>
      <h3>Metrics</h3>
      <table cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th align="left">Date</th><th align="right">Reviews</th><th align="right">Avg Sentiment</th></tr></thead>
        <tbody>
          {metrics.map((m, i) => (
            <tr key={i}>
              <td>{m.date}</td>
              <td align="right">{m.review_count}</td>
              <td align="right">{m.avg_sentiment.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ marginTop: 16 }}>Top 5 Negative Reviews</h3>
      <ol>
        {top.map((r, i) => (
          <li key={i} style={{ marginBottom: 8 }}>
            <strong>{(r.sentiment_score ?? 0).toFixed(2)}</strong> — {r.body.slice(0, 200)}
          </li>
        ))}
      </ol>
      <p style={{ fontSize: 12, color: "#666" }}>Manage preferences from your Rynith settings.</p>
    </div>
  );
}
