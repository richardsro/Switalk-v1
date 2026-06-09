/**
 * Meta API budget: under threshold fires immediately; at/over threshold
 * the publish step throws RetryAfterError (Inngest re-runs it next window).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetryAfterError } from "inngest";
import { db } from "./helpers/fake-supabase";

const publishSpy = vi.hoisted(() => vi.fn(async () => ({ externalId: "x" })));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));
vi.mock("@/lib/channels", () => ({
  getAdapter: () => ({ sendMessage: vi.fn(), publishPost: publishSpy }),
}));

import { trackMetaCall, META_QUEUE_THRESHOLD } from "@/lib/rate-limit";
import {
  publishPostHandler,
  type StepTools,
} from "@/lib/inngest/functions/publish-post";

const step: StepTools = {
  run: (_id, fn) => fn(),
  sleepUntil: async () => {},
};

const POST_ROW = {
  id: "post-1",
  user_id: "user-1",
  channel_ids: ["ch-ig"],
  content: "hi",
  media_urls: ["https://example.com/a.jpg"],
  scheduled_for: "2026-07-01T10:00:00.000Z",
  status: "pending",
};

describe("trackMetaCall", () => {
  it("allows calls under the queue threshold", async () => {
    db.reset({ "rpc:increment_api_usage": [{ data: 5 }] });
    const usage = await trackMetaCall(db.client() as never, "user-1");
    expect(usage).toMatchObject({ allowed: true, count: 5 });
  });

  it("queues calls past the threshold", async () => {
    db.reset({
      "rpc:increment_api_usage": [{ data: META_QUEUE_THRESHOLD + 1 }],
    });
    const usage = await trackMetaCall(db.client() as never, "user-1");
    expect(usage.allowed).toBe(false);
    expect(usage.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("fails open when the counter errors", async () => {
    db.reset({ "rpc:increment_api_usage": [{ error: { message: "boom" } }] });
    const usage = await trackMetaCall(db.client() as never, "user-1");
    expect(usage.allowed).toBe(true);
  });
});

describe("publish-post under rate limit", () => {
  beforeEach(() => publishSpy.mockClear());

  it("publishes Instagram posts while under budget", async () => {
    db.reset({
      scheduled_posts: [{ data: POST_ROW }, { error: null }, { error: null }],
      channels: [{ data: { id: "ch-ig", type: "instagram", metadata: {} } }],
      "rpc:increment_api_usage": [{ data: 10 }],
    });
    const result = await publishPostHandler({
      event: { data: { postId: "post-1", scheduledFor: POST_ROW.scheduled_for } },
      step,
    });
    expect(publishSpy).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ published: 1 });
  });

  it("throws RetryAfterError instead of firing when over budget", async () => {
    db.reset({
      scheduled_posts: [{ data: POST_ROW }, { error: null }],
      channels: [{ data: { id: "ch-ig", type: "instagram", metadata: {} } }],
      "rpc:increment_api_usage": [{ data: 181 }],
    });
    await expect(
      publishPostHandler({
        event: {
          data: { postId: "post-1", scheduledFor: POST_ROW.scheduled_for },
        },
        step,
      })
    ).rejects.toBeInstanceOf(RetryAfterError);
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
