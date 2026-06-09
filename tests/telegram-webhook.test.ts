/**
 * (a) Simulates an inbound Telegram message hitting the webhook —
 * no external services; the admin Supabase client is faked in memory.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "./helpers/fake-supabase";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));

import { POST } from "@/app/api/webhooks/telegram/route";

const SECRET = "test-telegram-secret";

function telegramUpdate(text = "hello from telegram") {
  return {
    update_id: 1,
    message: {
      message_id: 42,
      date: Math.floor(Date.now() / 1000),
      chat: { id: 555 },
      from: { id: 555, first_name: "Jane", last_name: "Doe", username: "jane" },
      text,
    },
  };
}

function request(body: unknown, secret = SECRET, bot = "999") {
  return new NextRequest(`http://test.local/api/webhooks/telegram?bot=${bot}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body: JSON.stringify(body),
  });
}

describe("Telegram webhook", () => {
  beforeEach(() => {
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
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

  it("rejects a missing/wrong secret token with 403", async () => {
    const res = await POST(request(telegramUpdate(), "wrong-secret") as never);
    expect(res.status).toBe(403);
    expect(db.of("messages", "insert")).toHaveLength(0);
  });

  it("ingests a text message into the fake DB", async () => {
    const res = await POST(request(telegramUpdate("hi Switalk!")) as never);
    expect(res.status).toBe(200);

    const inserts = db.of("messages", "insert");
    expect(inserts).toHaveLength(1);
    const row = inserts[0].args[0] as Record<string, unknown>;
    expect(row.content).toBe("hi Switalk!");
    expect(row.direction).toBe("inbound");
    expect(row.user_id).toBe("user-1");
    expect(row.channel_id).toBe("ch-1");
    expect(row.external_id).toBe("555:42");
    expect(row.sender_name).toBe("Jane Doe");
  });

  it("acks 200 and drops messages for unconnected bots", async () => {
    db.reset({ channels: [{ data: null }] });
    const res = await POST(request(telegramUpdate()) as never);
    expect(res.status).toBe(200); // Telegram must not retry forever
    expect(db.of("messages", "insert")).toHaveLength(0);
  });
});
