// app/api/billing/webhook/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Utility JSON response
 */
function j(status: number, payload: any) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * Upsert subscriptions row for an org.
 */
async function upsertSubscriptionRow({
  org_id,
  stripe_customer_id,
  stripe_subscription_id,
  status,
  current_period_end, // seconds since epoch (Stripe)
}: {
  org_id: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: Stripe.Subscription.Status | "incomplete" | "canceled" | string;
  current_period_end?: number | null;
}) {
  const admin = supabaseAdmin();

  const tier = (status || "").toLowerCase() === "active" ? "pro" : "free";

  const iso =
    current_period_end != null
      ? new Date(current_period_end * 1000).toISOString()
      : null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      org_id,
      stripe_customer_id: stripe_customer_id ?? null,
      stripe_subscription_id: stripe_subscription_id ?? null,
      status,
      tier,
      current_period_end: iso,
    },
    { onConflict: "org_id" }
  );

  if (error) {
    console.error("[webhook] subscriptions upsert failed", { org_id, error });
  }
}

/**
 * Resolve org_id for a subscription event:
 * 1) Prefer subscription.metadata.org_id if present
 * 2) Else, look up by subscription ID in our table
 * 3) Else, look up by customer ID in our table
 */
async function resolveOrgIdForSubEvent(
  s: Stripe.Subscription
): Promise<string | null> {
  const metaOrg = (s.metadata?.org_id || s.metadata?.ORG_ID || "").trim();
  if (metaOrg) return metaOrg;

  const admin = supabaseAdmin();

  if (s.id) {
    const { data } = await admin
      .from("subscriptions")
      .select("org_id")
      .eq("stripe_subscription_id", s.id)
      .maybeSingle();
    if (data?.org_id) return data.org_id as string;
  }

  const cid = typeof s.customer === "string" ? s.customer : s.customer?.id;
  if (cid) {
    const { data } = await admin
      .from("subscriptions")
      .select("org_id")
      .eq("stripe_customer_id", cid)
      .maybeSingle();
    if (data?.org_id) return data.org_id as string;
  }

  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!whSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET not set");
    return j(500, { error: "Server misconfigured" });
  }
  if (!sig) {
    return j(400, { error: "Missing Stripe-Signature header" });
  }

  // IMPORTANT: use the raw body for verification
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error("[webhook] signature verification failed", {
      msg: err?.message || err,
    });
    return j(400, { error: "Invalid signature" });
  }

  // You can early-ack for events you don't care about
  const type = event.type;

  try {
    const stripe = getStripe();

    // 1) Checkout completed → map session to org + persist sub/customer
    if (type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;

      // We set this when creating checkout sessions
      const org_id =
        (s.metadata?.org_id as string | undefined) ||
        (s.client_reference_id as string | undefined) ||
        "";

      if (!org_id) {
        console.warn("[webhook] checkout.session.completed without org_id", {
          session: s.id,
        });
        return NextResponse.json({ received: true });
      }

      // Get subscription/customer from the session
      const subId =
        typeof s.subscription === "string"
          ? s.subscription
          : (s.subscription as Stripe.Subscription | null)?.id;

      const customerId =
        typeof s.customer === "string"
          ? s.customer
          : (s.customer as Stripe.Customer | null)?.id;

      let current_period_end: number | null = null;
      let status: string = "incomplete";

      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        current_period_end = sub.current_period_end ?? null;
        status = sub.status;
      }

      await upsertSubscriptionRow({
        org_id,
        stripe_customer_id: customerId ?? null,
        stripe_subscription_id: subId ?? null,
        status,
        current_period_end,
      });

      return NextResponse.json({ received: true });
    }

    // 2) Subscription lifecycle updates
    if (
      type === "customer.subscription.created" ||
      type === "customer.subscription.updated" ||
      type === "customer.subscription.deleted"
    ) {
      const s = event.data.object as Stripe.Subscription;

      const org_id = await resolveOrgIdForSubEvent(s);
      if (!org_id) {
        console.warn(
          "[webhook] could not resolve org_id for subscription event",
          {
            type,
            subId: s.id,
            cust: typeof s.customer === "string" ? s.customer : s.customer?.id,
          }
        );
        return NextResponse.json({ received: true });
      }

      await upsertSubscriptionRow({
        org_id,
        stripe_customer_id:
          typeof s.customer === "string" ? s.customer : s.customer?.id,
        stripe_subscription_id: s.id,
        status: s.status,
        current_period_end: s.current_period_end ?? null,
      });

      return NextResponse.json({ received: true });
    }

    // Optional: handle payment failures to downgrade immediately if desired
    // if (type === "invoice.payment_failed") { ... }

    // Not a type we care about → ack
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[webhook] handler error", {
      type,
      msg: err?.message || err,
    });
    // Always 200 to prevent Stripe retries if the error is non-fatal to your state,
    // but if you want retries, return 500:
    return j(200, { received: true });
  }
}
