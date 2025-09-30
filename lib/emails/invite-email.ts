// lib/email.ts
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "Rynith <no-reply@rynith.com>";

/**
 * Sends an invite email using Resend's HTTP API.
 * No SDK required.
 */
export async function sendInviteEmail(
  to: string,
  acceptUrl: string,
  orgName?: string
) {
  // If not configured (dev), just log the link so you can copy/paste it.
  if (!RESEND_API_KEY) {
    console.log(
      `[invite] RESEND_API_KEY missing. Invite link for ${to}: ${acceptUrl}`
    );
    return;
  }

  const subject = `You’re invited to ${orgName ? orgName : "Rynith"}`;
  const html = `
    <div style="font-family:Inter,system-ui,Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 8px 0;color:#111">You’ve been invited</h2>
      <p style="margin:0 0 16px 0;color:#444">
        You’ve been invited to join ${
          orgName ? orgName : "a workspace"
        } on <strong>Rynith</strong>.
      </p>
      <a href="${acceptUrl}"
         style="display:inline-block;background:#6A0DAD;color:#fff;text-decoration:none;
                padding:10px 14px;border-radius:10px;font-weight:600">
        Accept invite
      </a>
      <p style="margin:16px 0 0 0;color:#666;font-size:13px">
        If the button doesn’t work, paste this link into your browser:<br/>
        <span style="word-break:break-all">${acceptUrl}</span>
      </p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.warn("[invite] Resend error", res.status, text);
    // Don't throw in production path; your API can still return the accept_url
    // so the UI shows success and you can manually share the link if needed.
  }
}
