// app/api/billing/portal/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server"; // cookie-bound anon (for auth.getUser)
import { supabaseAdmin } from "@/lib/supabase-admin"; // service role client (bypasses RLS)
import { getStripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limits";

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  // ---- rate limit per IP ----
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "anon";
  const rl = rateLimit(`billing:portal:${ip}`, 10, 60_000);
  if (!rl.allowed)
    return j(429, {
      error: "Too many requests",
      retryAfterMs: rl.retryAfterMs,
    });

  // ---- auth ----
  const anon = await supabaseServer();
  const { data: auth } = await anon.auth.getUser();
  const me = auth?.user;
  if (!me) return j(401, { error: "Unauthorized" });

  // ---- resolve org + role (latest membership) ----
  const admin = supabaseAdmin();
  const { data: memRows, error: memErr } = await admin
    .from("org_members")
    .select("org_id, role, created_at")
    .eq("user_id", me.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (memErr) return j(400, { error: memErr.message });
  const org_id = memRows?.[0]?.org_id as string | undefined;
  const myRole = memRows?.[0]?.role as "owner" | "admin" | "member" | undefined;
  if (!org_id) return j(400, { error: "No org" });

  // only owners can manage billing (adjust if you want admins too)
  if (myRole !== "owner")
    return j(403, { error: "Only the owner can manage billing" });

  const stripe = getStripe();

  // ---- get existing stripe customer or create one ----
  const { data: subRow, error: subErr } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", org_id)
    .maybeSingle();
  if (subErr) return j(400, { error: subErr.message });

  let customerId = subRow?.stripe_customer_id || "";

  try {
    if (!customerId) {
      // create a new customer for this org
      const email = me.email || undefined;
      const customer = await stripe.customers.create({
        email,
        metadata: { org_id },
      });

      customerId = customer.id;

      // upsert subscriptions row with the new customer id
      const { error: upErr } = await admin.from("subscriptions").upsert(
        {
          org_id,
          stripe_customer_id: customerId,
          // keep existing defaults for status/tier if new row
          status: "incomplete",
          tier: "free",
        },
        { onConflict: "org_id" }
      );
      if (upErr) {
        console.error("[billing/portal] upsert subscriptions failed", {
          org_id,
          upErr,
        });
        // not fatal for portal; continue
      }
    }
  } catch (err: any) {
    console.error("[stripe] customers.create failed", {
      msg: err?.message || err,
      org_id,
      keyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
        ? "test"
        : "live",
    });
    return j(500, { error: "Stripe error creating customer" });
  }

  // ---- build return_url from the actual request origin ----
  const u = new URL(req.url);
  const origin = `${u.protocol}//${u.host}`;
  const returnUrl = `${origin}/settings?billing=portal_return`;

  // ---- create portal session and redirect ----
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    if (!session.url) throw new Error("Portal session created but no URL");
    // 303 redirect so a <form method="post"> follows the Location
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err: any) {
    console.error("[stripe] billingPortal.sessions.create failed", {
      msg: err?.message || err,
      org_id,
      customerId,
    });
    return j(500, { error: "Stripe error creating billing portal session" });
  }
}
