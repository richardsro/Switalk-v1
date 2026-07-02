/**
 * Simulates inbound email hitting the webhook — no external services;
 * the admin Supabase client is faked in memory.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "./helpers/fake-supabase";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));

import { POST } from "@/app/api/webhooks/email/route";

const SECRET = "test-email-secret";

function emailPayload(overrides: Record<string, unknown> = {}) {
  return {
    to: "Jane@Business.COM",
    from: "Customer@Example.com",
    fromName: "Chris Customer",
    subject: "Booking question",
    text: "Do you have any slots on Friday?",
    messageId: "msg-abc",
    ...overrides,
  };
}

function request(body: unknown, secret: string | null = SECRET) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== null) headers["x-webhook-secret"] = secret;
  return new NextRequest("http://test.local/api/webhooks/email", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("Email webhook", () => {
  beforeEach(() => {
    process.env.EMAIL_WEBHOOK_SECRET = SECRET;
    db.reset({
      // ingestInboundMessage call order for a brand-new conversation:
      channels: [{ data: { id: "ch-1", user_id: "user-1" } }],
      conversations: [
        { data: null }, // no existing conversation
        { data: { id: "conv-1", contact_id: "contact-1" } }, // created
        { error: null }, // last_message update
      ],
      contacts: [
        { data: { id: "contact-1" } }, // created
        { error: null }, // last_seen update
      ],
      messages: [
        { error: null }, // insert
        { count: 1 }, // unread count
      ],
    });
  });

  it("fails closed with 503 when the secret is not configured", async () => {
    delete process.env.EMAIL_WEBHOOK_SECRET;
    const res = await POST(request(emailPayload()) as never);
    expect(res.status).toBe(503);
    expect(db.of("messages", "insert")).toHaveLength(0);
  });

  it("rejects a wrong secret with 403", async () => {
    const res = await POST(request(emailPayload(), "wrong") as never);
    expect(res.status).toBe(403);
    expect(db.of("messages", "insert")).toHaveLength(0);
  });

  it("rejects payloads missing required fields with 400", async () => {
    const res = await POST(request({ from: "a@b.c" }) as never);
    expect(res.status).toBe(400);
    expect(db.of("messages", "insert")).toHaveLength(0);
  });

  it("ingests mail, matching the channel on the lowercased `to` address", async () => {
    const res = await POST(request(emailPayload()) as never);
    expect(res.status).toBe(200);

    // Channel lookup used the normalized recipient address
    const channelEqs = db
      .of("channels", "eq")
      .map((c) => c.args as [string, unknown]);
    expect(channelEqs).toContainEqual(["external_id", "jane@business.com"]);

    const inserts = db.of("messages", "insert");
    expect(inserts).toHaveLength(1);
    const row = inserts[0].args[0] as Record<string, unknown>;
    expect(row.direction).toBe("inbound");
    expect(row.content).toBe("Booking question\n\nDo you have any slots on Friday?");
    expect(row.sender_name).toBe("Chris Customer");
    expect(row.user_id).toBe("user-1");
    expect(row.channel_id).toBe("ch-1");
  });
});
