/**
 * Sender-profile enrichment job — fills in real names for Messenger/IG
 * contacts. Graph API is faked via global fetch; DB via fake-supabase.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RetryAfterError } from "inngest";
import { db } from "./helpers/fake-supabase";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));

import {
  enrichContactHandler,
  type EnrichContactEvent,
} from "@/lib/inngest/functions/enrich-contact";
import type { StepTools } from "@/lib/inngest/functions/publish-post";

const step: StepTools = {
  async run<T>(_id: string, fn: () => Promise<T>) {
    return fn();
  },
  async sleepUntil() {},
};

function event(
  overrides: Partial<EnrichContactEvent["data"]> = {}
): EnrichContactEvent {
  return {
    data: {
      channelType: "facebook",
      channelExternalId: "page-1",
      senderId: "12345",
      contactId: "contact-1",
      ...overrides,
    },
  };
}

function fakeGraph(profile: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status: ok ? 200 : 400,
      json: async () => profile,
    }))
  );
}

describe("enrich-contact Inngest job", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    db.reset({
      channels: [{ data: { user_id: "user-1", access_token: "tok" } }],
      contacts: [
        { data: { name: "12345", handles: { facebook: "12345" } } },
        { error: null }, // update
      ],
      "rpc:increment_api_usage": [{ data: 5 }],
    });
  });

  it("looks up a Messenger profile and names the contact", async () => {
    fakeGraph({ first_name: "Jane", last_name: "Doe" });

    const result = await enrichContactHandler({ event: event(), step });

    expect(result).toEqual({ enriched: true, name: "Jane Doe" });
    const updates = db.of("contacts", "update");
    expect(updates).toHaveLength(1);
    expect((updates[0].args[0] as { name: string }).name).toBe("Jane Doe");
  });

  it("merges the IG username into handles", async () => {
    db.reset({
      channels: [{ data: { user_id: "user-1", access_token: "tok" } }],
      contacts: [
        { data: { name: "Unknown", handles: {} } },
        { error: null },
      ],
      "rpc:increment_api_usage": [{ data: 5 }],
    });
    fakeGraph({ name: "Jane Doe", username: "jane.doe" });

    const result = await enrichContactHandler({
      event: event({ channelType: "instagram" }),
      step,
    });

    expect(result).toEqual({ enriched: true, name: "Jane Doe" });
    const row = db.of("contacts", "update")[0].args[0] as {
      handles: Record<string, string>;
    };
    expect(row.handles.instagram).toBe("@jane.doe");
  });

  it("skips contacts that already have a real name (no Graph call)", async () => {
    db.reset({
      channels: [{ data: { user_id: "user-1", access_token: "tok" } }],
      contacts: [{ data: { name: "Jane Doe", handles: {} } }],
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const result = await enrichContactHandler({ event: event(), step });

    expect(result).toEqual({ enriched: false, reason: "already named" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws RetryAfterError when the Meta budget is exhausted", async () => {
    db.reset({
      channels: [{ data: { user_id: "user-1", access_token: "tok" } }],
      contacts: [{ data: { name: "12345", handles: {} } }],
      "rpc:increment_api_usage": [{ data: 181 }],
    });

    await expect(
      enrichContactHandler({ event: event(), step })
    ).rejects.toBeInstanceOf(RetryAfterError);
  });

  it("ends gracefully when the profile is unavailable (EU privacy / 4xx)", async () => {
    fakeGraph({ error: { message: "profile unavailable" } }, false);

    const result = await enrichContactHandler({ event: event(), step });

    expect(result).toEqual({ enriched: false, reason: "profile unavailable" });
    expect(db.of("contacts", "update")).toHaveLength(0);
  });
});
