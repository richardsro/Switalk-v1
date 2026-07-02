/**
 * Webchat history replay endpoint — public, visitor-scoped, field-stripped.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "./helpers/fake-supabase";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));

import { GET } from "@/app/api/webchat/history/route";

function request(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  return new NextRequest(`http://test.local/api/webchat/history?${qs}`);
}

describe("webchat history endpoint", () => {
  beforeEach(() => {
    db.reset();
  });

  it("400s without both ids", async () => {
    expect((await GET(request({ widgetId: "w-1" }) as never)).status).toBe(400);
    expect((await GET(request({ visitorId: "v-1" }) as never)).status).toBe(400);
  });

  it("400s on an oversized visitorId (abuse guard)", async () => {
    const res = await GET(
      request({ widgetId: "w-1", visitorId: "x".repeat(65) }) as never
    );
    expect(res.status).toBe(400);
  });

  it("404s for an unknown or inactive widget", async () => {
    db.reset({ channels: [{ data: null }] });
    const res = await GET(
      request({ widgetId: "nope", visitorId: "v-1" }) as never
    );
    expect(res.status).toBe(404);
  });

  it("returns an empty list for a visitor with no conversation", async () => {
    db.reset({
      channels: [{ data: { id: "ch-1" } }],
      conversations: [{ data: null }],
    });
    const res = await GET(
      request({ widgetId: "w-1", visitorId: "new-visitor" }) as never
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ messages: [] });
  });

  it("returns the thread oldest-first with only whitelisted fields", async () => {
    db.reset({
      channels: [{ data: { id: "ch-1" } }],
      conversations: [{ data: { id: "conv-1" } }],
      messages: [
        {
          // endpoint queries newest-first, then reverses
          data: [
            { direction: "outbound", content: "Hi! How can I help?", received_at: "2026-07-02T10:01:00Z" },
            { direction: "inbound", content: "Hello?", received_at: "2026-07-02T10:00:00Z" },
          ],
        },
      ],
    });

    const res = await GET(
      request({ widgetId: "w-1", visitorId: "v-1" }) as never
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const body = await res.json();
    expect(body.messages).toEqual([
      { direction: "inbound", content: "Hello?", received_at: "2026-07-02T10:00:00Z" },
      { direction: "outbound", content: "Hi! How can I help?", received_at: "2026-07-02T10:01:00Z" },
    ]);
    // field whitelist enforced at the query level
    const selects = db.of("messages", "select");
    expect(selects[0].args[0]).toBe("direction, content, received_at");
  });
});
