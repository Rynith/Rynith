// lib/stripe.ts
import Stripe from "stripe";

// Use a stable, published Stripe API version
const STRIPE_API_VERSION: Stripe.StripeConfig["apiVersion"] = "2024-06-20";

// Expose price IDs from env
export const PRICES = {
  monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
} as const;

export function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

// Lazily instantiate Stripe so dev builds don't crash if the key is missing
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("[stripe] STRIPE_SECRET_KEY is not set");
  _stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
  return _stripe;
}
