import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan, Subscription } from "@/lib/types";
import { startCheckout, openBillingPortal } from "./actions";

export const dynamic = "force-dynamic";

const PLANS: Array<{ plan: Exclude<Plan, "trial">; blurb: string; highlight?: boolean }> = [
  { plan: "lite", blurb: "3 channels · 10 posts/mo · 100 contacts" },
  { plan: "pro", blurb: "All 6 channels · unlimited posts & contacts", highlight: true },
  { plan: "business", blurb: "Everything in Pro + 2-3 team seats" },
];

export default async function BillingPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .maybeSingle();
  const sub = data as Subscription | null;
  const currentPlan: Plan = sub?.plan ?? "trial";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold">Plan & billing</h1>
        <p className="text-sm text-zinc-500">
          Current plan:{" "}
          <Badge color={currentPlan === "trial" ? "yellow" : "green"}>
            {PLAN_LIMITS[currentPlan].label}
          </Badge>
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {PLANS.map(({ plan, blurb, highlight }) => (
          <Card key={plan} className={highlight ? "border-indigo-500" : undefined}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {PLAN_LIMITS[plan].label}
                {highlight && <Badge>Most popular</Badge>}
              </CardTitle>
              <CardDescription>
                £{PLAN_LIMITS[plan].priceGbp}/month — {blurb}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {currentPlan === plan ? (
                <form action={openBillingPortal}>
                  <Button variant="outline" type="submit">
                    Manage subscription
                  </Button>
                </form>
              ) : (
                <form action={startCheckout.bind(null, plan)}>
                  <Button type="submit" variant={highlight ? "default" : "secondary"}>
                    {currentPlan === "trial" ? "Start 14-day free trial" : "Switch plan"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        14-day free trial · no credit card required · cancel anytime
      </p>
    </div>
  );
}
