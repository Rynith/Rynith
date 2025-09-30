// React template for daily alerts email
import * as React from "react";
type AlertRow = { kind: string; severity: "info"|"warning"|"critical"; message: string };

export function AlertsEmail({ date, orgName, alerts }: { date: string; orgName: string; alerts: AlertRow[] }) {
  return (
    <div style={{ fontFamily: "Inter, Arial, sans-serif", color: "#111" }}>
      <h2>Alerts for {orgName} — {date}</h2>
      {alerts.length === 0 ? (
        <p>No alerts today 🎉</p>
      ) : (
        <ul style={{ padding: 0, listStyle: "none" }}>
          {alerts.map((a, i) => (
            <li key={i} style={{ margin: "12px 0", padding: "12px", border: "1px solid #eee", borderRadius: 8 }}>
              <strong>{a.kind}</strong> — <em>{a.severity}</em>
              <div>{a.message}</div>
            </li>
          ))}
        </ul>
      )}
      <p style={{ fontSize: 12, color: "#666" }}>You’re receiving this because alerts are enabled in Rynith.</p>
    </div>
  );
}
