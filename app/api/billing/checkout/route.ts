// app/api/billing/checkout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripe, PRICES } from "@/lib/stripe";
import { rateLimit } from "@/lib/rate-limits";
import type Stripe from "stripe";

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  // ── Rate limit per IP
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "anon";
  const rl = rateLimit(`billing:checkout:${ip}`, 10, 60_000);
  if (!rl.allowed)
    return j(429, {
      error: "Too many requests",
      retryAfterMs: rl.retryAfterMs,
    });

  // ── Auth (cookie-bound)
  const anon = await supabaseServer();
  const { data: auth } = await anon.auth.getUser();
  if (!auth?.user) return j(401, { error: "Unauthorized" });

  // ── Resolve org (latest membership)
  const admin = supabaseAdmin();
  const { data: memRows, error: memErr } = await admin
    .from("org_members")
    .select("org_id, role, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (memErr) return j(400, { error: memErr.message });

  const org_id = memRows?.[0]?.org_id as string | undefined;
  if (!org_id) return j(400, { error: "No org" });

  // ── Plan & price
  const url = new URL(req.url);
  const plan = (url.searchParams.get("plan") || "monthly").toLowerCase(); // "monthly" | "annual"
  const priceId = plan === "annual" ? PRICES.annual : PRICES.monthly;
  if (!priceId) return j(500, { error: "Price not configured" });

  const stripe = getStripe();

  // ── Preflight: ensure the price ID exists for this key/mode
  let price: Stripe.Price;
  try {
    price = await stripe.prices.retrieve(priceId);
    if (!price.active) return j(400, { error: "Selected price is not active" });
    if (price.type !== "recurring")
      return j(400, { error: "Selected price is not a recurring price" });
  } catch (err: any) {
    console.error("[stripe] prices.retrieve failed", {
      priceId,
      msg: err?.message || err,
      keyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
        ? "test"
        : "live",
    });
    return j(500, { error: "Stripe price not found for this account/mode" });
  }

  // ── Reuse existing customer if known
  const { data: subRow } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("org_id", org_id)
    .maybeSingle();

  // Build return URLs from the actual request origin (prevents auth bounce)
  const u = new URL(req.url);
  const origin = `${u.protocol}//${u.host}`;
  const successUrl = `${origin}/settings?billing=success`;
  const cancelUrl = `${origin}/settings?billing=cancel`;

  const baseParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: org_id, // critical for webhook mapping to org
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: { org_id, plan },
  };

  const withCustomer: Stripe.Checkout.SessionCreateParams =
    subRow?.stripe_customer_id
      ? { ...baseParams, customer: subRow.stripe_customer_id }
      : baseParams;

  try {
    // Try with customer (if any)
    const session = await stripe.checkout.sessions.create(withCustomer);
    if (!session.url) throw new Error("Session created but no URL");
    return j(200, { url: session.url });
  } catch (err: any) {
    const msg = err?.message || String(err);
    const code = err?.raw?.code || err?.code;
    const param = err?.raw?.param || err?.param;

    console.error("[stripe] checkout create (1st try) failed", {
      msg,
      code,
      param,
      org_id,
      plan,
      priceId,
      hadCustomer: !!subRow?.stripe_customer_id,
      keyMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
        ? "test"
        : "live",
    });

    // If the saved customer looks stale (wrong mode), retry without it
    const customerLooksBad =
      !!subRow?.stripe_customer_id &&
      (param === "customer" ||
        /no such customer/i.test(msg) ||
        code === "resource_missing");

    if (customerLooksBad) {
      try {
        const session = await stripe.checkout.sessions.create(baseParams);
        if (!session.url) throw new Error("Session created (retry) but no URL");
        console.warn("[stripe] retry without customer succeeded", {
          org_id,
          removedCustomer: subRow?.stripe_customer_id,
        });
        return j(200, { url: session.url });
      } catch (err2: any) {
        console.error("[stripe] checkout create retry failed", {
          msg: err2?.message || err2,
          org_id,
          plan,
          priceId,
        });
      }
    }

    return j(500, { error: "Stripe error creating checkout session" });
  }
}
