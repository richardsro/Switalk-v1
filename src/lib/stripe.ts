import Stripe from "stripe";

let stripe: Stripe | null = null;

/** Lazy singleton so the build doesn't require STRIPE_SECRET_KEY. */
export function getStripe(): Stripe {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    stripe = new Stripe(key);
  }
  return stripe;
}
