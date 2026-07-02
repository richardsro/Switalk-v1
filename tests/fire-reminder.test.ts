/**
 * Simulates a follow-up reminder's Inngest job firing — the handler is
 * driven with a fake `step` and a fake admin client; Resend is mocked.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "./helpers/fake-supabase";

const sendSpy = vi.hoisted(() =>
  vi.fn(async () => ({ data: { id: "email-1" }, error: null }))
);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => db.client(),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendSpy };
  },
}));

import {
  fireReminderHandler,
  type StepTools,
} from "@/lib/inngest/functions/fire-reminder";

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

const REMINDER_ROW = {
  id: "rem-1",
  user_id: "user-1",
  conversation_id: "conv-1",
  remind_at: "2026-07-03T09:00:00.000Z",
  status: "pending",
};

describe("fire-reminder Inngest job", () => {
  beforeEach(() => {
    sendSpy.mockClear();
    sendSpy.mockImplementation(async () => ({
      data: { id: "email-1" },
      error: null,
    }));
    process.env.SYSTEM_EMAIL_FROM = "Switalk <hello@switalk.com>";
    process.env.RESEND_API_KEY = "re_test";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.switalk.com";
  });

  it("sleeps until remind_at, flags the conversation, fires, and emails", async () => {
    db.reset({
      reminders: [
        { data: REMINDER_ROW }, // load-reminder
        { error: null }, // mark fired
      ],
      conversations: [
        { data: { unread_count: 2 } }, // read current count
        { error: null }, // update
      ],
    });

    const step = fakeStep();
    const result = await fireReminderHandler({
      event: { data: { reminderId: "rem-1", remindAt: REMINDER_ROW.remind_at } },
      step,
    });

    expect(step.slept).toEqual([REMINDER_ROW.remind_at]);
    expect(result).toEqual({ fired: true });

    const convUpdates = db.of("conversations", "update");
    expect(convUpdates).toHaveLength(1);
    expect(convUpdates[0].args[0]).toEqual({
      reminder_due: true,
      unread_count: 3,
    });

    const remUpdates = db.of("reminders", "update");
    expect(remUpdates).toHaveLength(1);
    expect(remUpdates[0].args[0]).toEqual({ status: "fired" });

    expect(sendSpy).toHaveBeenCalledTimes(1);
    const email = sendSpy.mock.calls[0][0] as unknown as Record<string, string>;
    expect(email.to).toBe("t@t.t");
    expect(email.text).toContain("/inbox/conv-1");
  });

  it("skips reminders that are no longer pending (cancelled meanwhile)", async () => {
    db.reset({
      reminders: [{ data: { ...REMINDER_ROW, status: "cancelled" } }],
    });

    const result = await fireReminderHandler({
      event: { data: { reminderId: "rem-1", remindAt: REMINDER_ROW.remind_at } },
      step: fakeStep(),
    });

    expect(result).toEqual({
      skipped: true,
      reason: "reminder missing or no longer pending",
    });
    expect(db.of("conversations", "update")).toHaveLength(0);
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it("still succeeds when the email nudge fails", async () => {
    sendSpy.mockImplementation(async () => {
      throw new Error("resend down");
    });
    db.reset({
      reminders: [{ data: REMINDER_ROW }, { error: null }],
      conversations: [{ data: { unread_count: 0 } }, { error: null }],
    });

    const result = await fireReminderHandler({
      event: { data: { reminderId: "rem-1", remindAt: REMINDER_ROW.remind_at } },
      step: fakeStep(),
    });

    expect(result).toEqual({ fired: true });
    expect(db.of("conversations", "update")).toHaveLength(1);
  });
});
