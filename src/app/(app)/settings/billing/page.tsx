import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/lib/plans";
import { getEffectivePlan } from "@/lib/billing";
import type { Plan } from "@/lib/types";
import { startCheckout, openBillingPortal } from "./actions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLANS: Array<{
  plan: Exclude<Plan, "trial">;
  tagline: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    plan: "lite",
    tagline: "Perfect for getting started",
    features: [
      "3 connected channels",
      "10 scheduled posts/month",
      "100 contacts",
      "Unified inbox",
    ],
  },
  {
    plan: "pro",
    tagline: "Everything you need to grow",
    features: [
      "All 6 channels",
      "Unlimited scheduled posts",
      "Unlimited contacts",
      "Priority support",
      "Advanced analytics",
    ],
    highlight: true,
  },
  {
    plan: "business",
    tagline: "For growing businesses",
    features: [
      "Everything in Pro",
      "2–3 team members",
      "Future add-ons included",
      "Dedicated account manager",
    ],
  },
];

export default async function BillingPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { plan: currentPlan, trialExpired, trialEndsAt } =
    await getEffectivePlan(supabase, user!.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-8">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">
          Plan & billing
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Current plan:{" "}
          <Badge color={currentPlan === "trial" ? "yellow" : "green"}>
            {PLAN_LIMITS[currentPlan].label}
          </Badge>
          {currentPlan === "trial" && trialEndsAt && !trialExpired && (
            <span className="ml-2">
              ends {format(new Date(trialEndsAt), "d MMM yyyy")}
            </span>
          )}
        </p>
        {trialExpired && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Your free trial has ended. Pick a plan below to keep connecting
            channels and scheduling posts — your inbox and data are untouched.
          </p>
        )}
      </header>

      <div className="flex flex-col gap-6">
        {PLANS.map(({ plan, tagline, features, highlight }) => (
          <div key={plan} className="relative">
            {highlight && (
              <span className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-500 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
                Most popular
              </span>
            )}
            <Card
              className={cn(
                "p-6 text-center",
                highlight && "border-2 border-brand-500"
              )}
            >
              <h2 className="text-lg font-bold text-gray-900">
                {PLAN_LIMITS[plan].label}
              </h2>
              <p className="mt-2">
                <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                  £{PLAN_LIMITS[plan].priceGbp}
                </span>
                <span className="text-sm font-medium text-gray-400">
                  /month
                </span>
              </p>
              <p className="mt-3 text-sm text-gray-500">{tagline}</p>

              <ul className="mt-5 divide-y divide-gray-100 text-left">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 py-2.5 text-sm text-gray-600"
                  >
                    <Check className="h-4 w-4 shrink-0 text-brand-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {currentPlan === plan ? (
                  <form action={openBillingPortal}>
                    <Button variant="outline" type="submit" className="w-full">
                      Manage subscription
                    </Button>
                  </form>
                ) : (
                  <form action={startCheckout.bind(null, plan)}>
                    <Button
                      type="submit"
                      variant={highlight ? "default" : "outline"}
                      className="w-full"
                    >
                      {currentPlan === "trial"
                        ? "Start 14-day free trial"
                        : "Switch plan"}
                    </Button>
                  </form>
                )}
              </div>
            </Card>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        14-day free trial · no credit card required · cancel anytime
      </p>
    </div>
  );
}
