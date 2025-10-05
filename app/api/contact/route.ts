// app/api/contact/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Resend } from "resend";
// Optional DB logging (comment out if you don’t want it)
import { supabaseAdmin } from "@/lib/supabase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);
const shouldSend = process.env.SEND_EMAILS !== "false"; // set to "false" on Preview to save quota

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  try {
    // --- parse body (supports JSON or form) ---
    const ct = req.headers.get("content-type") || "";
    let body: Record<string, string> = {};

    if (ct.includes("application/json")) {
      body = await req.json();
    } else if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      fd.forEach((v, k) => (body[k] = String(v)));
    } else if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      body = Object.fromEntries(new URLSearchParams(text));
    } else {
      return j(415, { error: "Unsupported content-type" });
    }

    // --- fields ---
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const company = (body.company || "").trim();
    const message = (body.message || "").trim();

    // Honeypot (spam bots fill hidden field)
    const hp = (body.website || "").trim(); // add <input name="website" className="hidden" tabIndex={-1} />
    if (hp) return j(200, { ok: true }); // silently accept but do nothing

    if (!name || !email)
      return j(400, { error: "Name and email are required" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return j(400, { error: "Invalid email address" });
    }

    // --- email setup ---
    const FROM = process.env.EMAIL_FROM; // e.g. Rynith <no-reply@notifications.rynith.com>
    const TO = process.env.CONTACT_TO; // your inbox, e.g. founder@rynith.com
    if (!FROM || !TO) return j(500, { error: "Email route not configured" });

    const subject = `New demo request from ${name}`;
    const text = `Name: ${name}
Email: ${email}
Company: ${company}

${message}`;
    const html = `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 10px">New Demo Request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company)}</p>
        <p><strong>Message:</strong><br/>${escapeHtml(message).replace(
          /\n/g,
          "<br/>"
        )}</p>
      </div>
    `.trim();

    // --- send or noop depending on flag ---
    if (shouldSend) {
      if (!process.env.RESEND_API_KEY) {
        return j(500, { error: "RESEND_API_KEY not set" });
      }
      await resend.emails.send({
        from: FROM,
        to: TO,
        subject,
        replyTo: "notifications@rynith.com", // your Zoho reply address
        text,
        html,
      });
    } else {
      console.log("EMAIL DISABLED", { name, email, company, message });
    }

    // --- optional: store lead (best-effort) ---
    try {
      const sb = supabaseAdmin?.();
      if (sb) {
        await sb.from("leads").insert({
          name,
          email,
          company,
          message,
          source: "demo",
        });
      }
    } catch {
      // ignore DB errors; email already (maybe) sent
    }

    return j(200, { ok: true });
  } catch (err: any) {
    return j(500, { error: err?.message || "Server error" });
  }
}

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ]!)
  );
}
