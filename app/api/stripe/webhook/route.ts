// app/api/stripe/webhook/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe"; // <-- type-only import for Stripe.* types

function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return j(400, { error: "Missing stripe-signature" });

  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whsec)
    return j(500, {
      error: "Server misconfigured: STRIPE_WEBHOOK_SECRET missing",
    });

  const stripe = getStripe();

  // IMPORTANT: raw body (req.text()) for signature verification
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, whsec) as Stripe.Event;
  } catch (err: any) {
    return j(400, { error: `Invalid signature: ${err?.message || "unknown"}` });
  }

  const admin = supabaseAdmin();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;

        const org_id =
          (s.client_reference_id as string | undefined) ||
          (s.metadata?.org_id as string | undefined);
        if (!org_id) break;

        const subscriptionId =
          typeof s.subscription === "string"
            ? s.subscription
            : s.subscription?.id;
        const customerId =
          typeof s.customer === "string" ? s.customer : s.customer?.id;

        let current_period_end: string | null = null;
        let status: string | null = null;

        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          current_period_end = sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null;
          status = sub.status;
        }

        await admin.from("subscriptions").upsert(
          {
            org_id,
            stripe_customer_id: customerId || undefined,
            stripe_subscription_id: subscriptionId || undefined,
            status: status || "active",
            tier: "pro",
            current_period_end,
          },
          { onConflict: "org_id" }
        );

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        const s = event.data.object as Stripe.Subscription;
        const customerId =
          typeof s.customer === "string" ? s.customer : s.customer.id;

        // find org by existing row (stripe_customer_id)
        const { data: subRow } = await admin
          .from("subscriptions")
          .select("org_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        const org_id = subRow?.org_id as string | undefined;
        if (!org_id) break;

        await admin.from("subscriptions").upsert(
          {
            org_id,
            stripe_customer_id: customerId,
            stripe_subscription_id: s.id,
            status: s.status,
            tier: "pro",
            current_period_end: s.current_period_end
              ? new Date(s.current_period_end * 1000).toISOString()
              : null,
          },
          { onConflict: "org_id" }
        );

        break;
      }

      default:
        // ignore other events for now
        break;
    }
  } catch (e: any) {
    console.error("[stripe][webhook] handler error:", e?.message || e);
    return j(500, { error: "Webhook handler error" });
  }

  // Acknowledge receipt
  return new NextResponse(null, { status: 200 });
}
