/**
 * (c) Simulates trial expiry being enforced — getEffectivePlan resolution
 * and the schedulePost server action rejecting an expired-trial user.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./helpers/fake-supabase";

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => db.client(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const inngestSend = vi.hoisted(() => vi.fn(async () => ({ ids: ["job-1"] })));
vi.mock("@/lib/inngest/client", () => ({ inngest: { send: inngestSend } }));

import { getEffectivePlan, TRIAL_EXPIRED_ERROR } from "@/lib/billing";
import { schedulePost } from "@/app/(app)/posts/actions";

const PAST = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const FUTURE = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

describe("getEffectivePlan", () => {
  it("uses the live subscription when one exists", async () => {
    db.reset({
      subscriptions: [{ data: { plan: "pro", status: "active" } }],
      profiles: [{ data: { trial_ends_at: PAST } }],
    });
    const result = await getEffectivePlan(db.client() as never, "user-1");
    expect(result).toMatchObject({ plan: "pro", trialExpired: false });
  });

  it("grants trial while the window is open", async () => {
    db.reset({
      subscriptions: [{ data: null }],
      profiles: [{ data: { trial_ends_at: FUTURE } }],
    });
    const result = await getEffectivePlan(db.client() as never, "user-1");
    expect(result).toMatchObject({ plan: "trial", trialExpired: false });
  });

  it("flags an expired trial with no subscription", async () => {
    db.reset({
      subscriptions: [{ data: null }],
      profiles: [{ data: { trial_ends_at: PAST } }],
    });
    const result = await getEffectivePlan(db.client() as never, "user-1");
    expect(result).toMatchObject({ plan: "trial", trialExpired: true });
  });

  it("ignores cancelled subscriptions and falls back to the trial window", async () => {
    db.reset({
      subscriptions: [{ data: { plan: "pro", status: "canceled" } }],
      profiles: [{ data: { trial_ends_at: PAST } }],
    });
    const result = await getEffectivePlan(db.client() as never, "user-1");
    expect(result).toMatchObject({ plan: "trial", trialExpired: true });
  });
});

describe("schedulePost trial enforcement", () => {
  beforeEach(() => inngestSend.mockClear());

  it("blocks scheduling for an expired trial", async () => {
    db.reset({
      subscriptions: [{ data: null }],
      profiles: [{ data: { trial_ends_at: PAST } }],
    });

    const result = await schedulePost({
      content: "Hello world",
      channelIds: ["6f0f1a3c-2c5e-4f0a-9b8e-0d1e2f3a4b5c"],
      scheduledFor: FUTURE,
    });

    expect(result).toEqual({ ok: false, error: TRIAL_EXPIRED_ERROR });
    expect(inngestSend).not.toHaveBeenCalled();
    expect(db.of("scheduled_posts", "insert")).toHaveLength(0);
  });

  it("allows scheduling during an active trial", async () => {
    db.reset({
      subscriptions: [{ data: null }],
      profiles: [{ data: { trial_ends_at: FUTURE } }],
      channels: [
        {
          data: [
            { id: "6f0f1a3c-2c5e-4f0a-9b8e-0d1e2f3a4b5c", type: "facebook" },
          ],
        },
      ],
      scheduled_posts: [
        { count: 0 }, // posts this month
        { data: { id: "post-1" } }, // insert
        { error: null }, // inngest_job_id update
      ],
    });

    const result = await schedulePost({
      content: "Hello world",
      channelIds: ["6f0f1a3c-2c5e-4f0a-9b8e-0d1e2f3a4b5c"],
      scheduledFor: FUTURE,
    });

    expect(result).toEqual({ ok: true });
    expect(inngestSend).toHaveBeenCalledTimes(1);
  });
});
