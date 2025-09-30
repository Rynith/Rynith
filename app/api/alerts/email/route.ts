// app/api/alerts/email/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isOrgPro } from "@/lib/billing";

// --- Simple Resend sender with fetch (no SDK) ---
async function sendEmailResend(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY || "";
  const from = process.env.EMAIL_FROM || "Rynith <no-reply@example.com>";

  // In dev (no key), just log and treat as success so we don’t spam repeatedly
  if (!key) {
    console.log(`[alerts][dev] Would send to ${to}: ${subject}`);
    return true;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn("[alerts][email] Resend error:", res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[alerts][email] Network error:", (e as Error)?.message || e);
    return false;
  }
}

function htmlEscape(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
}

function renderAlertsHtml(
  orgName: string | null,
  alerts: Array<{ kind: string; severity: string | null; message: string }>
) {
  const title = orgName
    ? `Alerts for ${htmlEscape(orgName)}`
    : "Today’s alerts";
  const items = alerts
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eee">
          <div style="font-weight:600;color:#111">${htmlEscape(a.kind)}${
        a.severity ? ` · ${htmlEscape(a.severity)}` : ""
      }</div>
          <div style="color:#444;line-height:1.5">${htmlEscape(a.message)}</div>
        </td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:Inter,system-ui,Arial,sans-serif;max-width:600px;margin:0 auto;padding:16px">
    <h2 style="margin:0 0 12px 0;color:#111">${title}</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
      ${items}
    </table>
    <p style="color:#666;font-size:12px;margin-top:16px">
      You’re receiving this because alerts are enabled for your workspace.
    </p>
  </div>`;
}

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  // Internal auth
  const provided = (req.headers.get("x-internal-key") ?? "").trim();
  const expected = process.env.INTERNAL_SYNC_KEY || "";
  if (!expected || provided !== expected)
    return j(401, { error: "Unauthorized" });

  const admin = supabaseAdmin();

  // Load orgs (name optional for email title)
  const { data: orgs, error: orgErr } = await admin
    .from("organizations")
    .select("id, name, last_alert_id");
  if (orgErr) return j(500, { error: orgErr.message });

  let sentOrgs = 0;

  for (const org of orgs ?? []) {
    const org_id = org.id as string;

    // --- Pro gate ---
    const pro = await isOrgPro(org_id).catch(() => false);
    if (!pro) continue;

    // Owners (could be multiple)
    const { data: owners, error: ownErr } = await admin
      .from("org_members")
      .select("user_id")
      .eq("org_id", org_id)
      .eq("role", "owner");
    if (ownErr) continue;
    const ownerIds = (owners ?? []).map((r: any) => r.user_id).filter(Boolean);
    if (!ownerIds.length) continue;

    // Resolve emails via Auth Admin API
    const emails = new Set<string>();
    for (const uid of ownerIds) {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        const email = data?.user?.email;
        if (email) emails.add(email);
      } catch {
        // ignore lookup failures
      }
    }
    if (!emails.size) continue;

    // Pull unsent alerts (greater than last_alert_id)
    const lastId = org.last_alert_id ?? 0;
    const { data: alerts, error: aErr } = await admin
      .from("alerts")
      .select("id, kind, severity, message")
      .eq("org_id", org_id)
      .gt("id", lastId)
      .order("id", { ascending: true });
    if (aErr || !alerts?.length) continue;

    // Render email once
    const html = renderAlertsHtml((org.name as string | null) ?? null, alerts);
    const subject = `Rynith: ${alerts.length} new alert${
      alerts.length > 1 ? "s" : ""
    }`;

    // Try sending to at least one owner; if any succeed, advance cursor
    let anySent = false;
    for (const to of emails) {
      const ok = await sendEmailResend(to, subject, html);
      if (ok) anySent = true;
    }

    if (anySent) {
      const maxId = alerts[alerts.length - 1].id as number;
      await admin
        .from("organizations")
        .update({ last_alert_id: maxId })
        .eq("id", org_id);
      sentOrgs += 1;
    }
  }

  return j(200, { ok: true, sent_orgs: sentOrgs });
}
