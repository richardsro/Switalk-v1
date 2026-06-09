import type { Plan } from "@/lib/types";

export interface PlanLimits {
  label: string;
  priceGbp: number;
  maxChannels: number;
  maxPostsPerMonth: number; // Infinity = unlimited
  maxContacts: number;
  teamSeats: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  // 14-day free trial behaves like Pro so users feel the full product
  trial: {
    label: "Free trial",
    priceGbp: 0,
    maxChannels: 6,
    maxPostsPerMonth: Infinity,
    maxContacts: Infinity,
    teamSeats: 1,
  },
  lite: {
    label: "Lite",
    priceGbp: 5,
    maxChannels: 3,
    maxPostsPerMonth: 10,
    maxContacts: 100,
    teamSeats: 1,
  },
  pro: {
    label: "Pro",
    priceGbp: 19,
    maxChannels: 6,
    maxPostsPerMonth: Infinity,
    maxContacts: Infinity,
    teamSeats: 1,
  },
  business: {
    label: "Business",
    priceGbp: 49,
    maxChannels: 6,
    maxPostsPerMonth: Infinity,
    maxContacts: Infinity,
    teamSeats: 3,
  },
};

export function canAddChannel(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxChannels;
}

export function canSchedulePost(plan: Plan, postsThisMonth: number): boolean {
  return postsThisMonth < PLAN_LIMITS[plan].maxPostsPerMonth;
}

export function canAddContact(plan: Plan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxContacts;
}

export function stripePriceIdFor(plan: Exclude<Plan, "trial">): string {
  const map: Record<Exclude<Plan, "trial">, string | undefined> = {
    lite: process.env.STRIPE_PRICE_LITE,
    pro: process.env.STRIPE_PRICE_PRO,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  const id = map[plan];
  if (!id) throw new Error(`Missing Stripe price id for plan "${plan}"`);
  return id;
}
