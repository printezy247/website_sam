import Stripe from "stripe";
import type { TierKey } from "@/config/tiers";

let stripe: Stripe | null = null;
export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key);
  return stripe;
}

export function priceIdFor(tier: TierKey, interval: "month" | "year") {
  const map: Record<string, string | undefined> = {
    free_month: process.env.STRIPE_PRICE_FREE_MONTH, free_year: process.env.STRIPE_PRICE_FREE_YEAR,
    pro_month: process.env.STRIPE_PRICE_PRO_MONTH, pro_year: process.env.STRIPE_PRICE_PRO_YEAR,
    elite_month: process.env.STRIPE_PRICE_ELITE_MONTH, elite_year: process.env.STRIPE_PRICE_ELITE_YEAR,
  };
  return map[`${tier}_${interval}`];
}
