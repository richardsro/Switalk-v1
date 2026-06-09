/**
 * (b) Simulates a scheduled post's Inngest job firing — the handler is
 * driven with a fake `step` (runs steps inline) and a fake admin client.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./helpers/fake-supabase";

const publishSpy = vi.hoisted(() => vi.fn(async () => ({ externalId: "ext-1" })));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));
vi.mock("@/lib/channels", () => ({
  getAdapter: () => ({ sendMessage: vi.fn(), publishPost: publishSpy }),
}));

import {
  publishPostHandler,
  type StepTools,
} from "@/lib/inngest/functions/publish-post";

function fakeStep(): StepTools & { slept: string[] } {
  const slept: string[] = [];
  return {
    slept,
    async run<T>(_id: string, fn: () => Promise<T>) {
      return fn();
    },
    async sleepUntil(_id: string, time: string | Date) {
      slept.push(String(time));
    },
  };
}

const POST_ROW = {
  id: "post-1",
  user_id: "user-1",
  channel_ids: ["ch-a", "ch-b"],
  content: "Big announcement!",
  media_urls: [],
  scheduled_for: "2026-07-01T10:00:00.000Z",
  status: "pending",
};

describe("publish-post Inngest job", () => {
  beforeEach(() => {
    publishSpy.mockClear();
    publishSpy.mockImplementation(async () => ({ externalId: "ext-1" }));
  });

  it("sleeps until the scheduled time, publishes to every channel, marks published", async () => {
    db.reset({
      scheduled_posts: [
        { data: POST_ROW }, // load-post
        { error: null }, // mark-publishing
        { error: null }, // finalize
      ],
      channels: [
        { data: { id: "ch-a", type: "facebook", user_id: "user-1" } },
        { data: { id: "ch-b", type: "instagram", user_id: "user-1", metadata: {} } },
      ],
    });

    const step = fakeStep();
    const result = await publishPostHandler({
      event: { data: { postId: "post-1", scheduledFor: POST_ROW.scheduled_for } },
      step,
    });

    expect(step.slept).toEqual([POST_ROW.scheduled_for]);
    expect(publishSpy).toHaveBeenCalledTimes(2);
    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ch-a" }),
      "Big announcement!",
      []
    );
    expect(result).toEqual({ published: 2, errors: [] });

    const updates = db.of("scheduled_posts", "update");
    expect(updates[0].args[0]).toEqual({ status: "publishing" });
    expect(updates[1].args[0]).toMatchObject({ status: "published", error: null });
  });

  it("records per-channel errors and fails the post when every channel fails", async () => {
    publishSpy.mockRejectedValue(new Error("Graph API down"));
    db.reset({
      scheduled_posts: [{ data: POST_ROW }, { error: null }, { error: null }],
      channels: [
        { data: { id: "ch-a", type: "facebook" } },
        { data: { id: "ch-b", type: "facebook" } },
      ],
    });

    const result = await publishPostHandler({
      event: { data: { postId: "post-1", scheduledFor: POST_ROW.scheduled_for } },
      step: fakeStep(),
    });

    expect(result.errors).toHaveLength(2);
    const finalize = db.of("scheduled_posts", "update")[1].args[0] as {
      status: string;
      error: string;
    };
    expect(finalize.status).toBe("failed");
    expect(finalize.error).toContain("Graph API down");
  });

  it("skips posts that were cancelled before firing", async () => {
    db.reset({
      scheduled_posts: [{ data: { ...POST_ROW, status: "cancelled" } }],
    });
    const result = await publishPostHandler({
      event: { data: { postId: "post-1", scheduledFor: POST_ROW.scheduled_for } },
      step: fakeStep(),
    });
    expect(result).toMatchObject({ skipped: true });
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
