import { Resend } from "resend";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Minimal step-tools surface the handler needs (same shape as
 * publish-post.ts) so tests can drive it with a fake `step`.
 */
export interface StepTools {
  run<T>(id: string, fn: () => Promise<T>): Promise<T>;
  sleepUntil(id: string, time: string | Date): Promise<void>;
}

export interface FireReminderEvent {
  data: { reminderId: string; remindAt: string };
}

interface ReminderRow {
  id: string;
  user_id: string;
  conversation_id: string;
  status: string;
}

/**
 * Sleeps until remind_at, then resurfaces the conversation in the inbox
 * (reminder_due flag + unread bump) and emails the user a nudge.
 *
 * IMPORTANT: Inngest replays this function from the top after each step —
 * no state may live in closure variables across steps.
 */
export async function fireReminderHandler({
  event,
  step,
}: {
  event: FireReminderEvent;
  step: StepTools;
}) {
  const { reminderId, remindAt } = event.data;

  await step.sleepUntil("wait-until-remind-at", remindAt);

  const reminder = await step.run("load-reminder", async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("id", reminderId)
      .single();
    if (error) throw new Error(`load-reminder failed: ${error.message}`);
    return data as ReminderRow;
  });

  if (!reminder || reminder.status !== "pending") {
    return { skipped: true, reason: "reminder missing or no longer pending" };
  }

  await step.run("surface-in-inbox", async () => {
    const supabase = createAdminClient();

    // reminder_due is the durable signal; the unread bump is best-effort
    // visibility (ingest recomputes unread_count on the next inbound).
    const { data: conversation } = await supabase
      .from("conversations")
      .select("unread_count")
      .eq("id", reminder.conversation_id)
      .single();
    const { error: convError } = await supabase
      .from("conversations")
      .update({
        reminder_due: true,
        unread_count: ((conversation?.unread_count as number) ?? 0) + 1,
      })
      .eq("id", reminder.conversation_id);
    if (convError) {
      throw new Error(`surface-in-inbox failed: ${convError.message}`);
    }

    const { error: fireError } = await supabase
      .from("reminders")
      .update({ status: "fired" })
      .eq("id", reminder.id);
    if (fireError) {
      throw new Error(`mark-fired failed: ${fireError.message}`);
    }
  });

  // Best-effort email nudge — a notification failure must never mark the
  // whole reminder as failed (the inbox flag is already set).
  await step.run("notify-email", async () => {
    try {
      const from = process.env.SYSTEM_EMAIL_FROM;
      if (!from || !process.env.RESEND_API_KEY) {
        return { emailed: false, reason: "email not configured" };
      }
      const supabase = createAdminClient();
      const { data } = await supabase.auth.admin.getUserById(reminder.user_id);
      const to = data?.user?.email;
      if (!to) return { emailed: false, reason: "user has no email" };

      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error } = await resend.emails.send({
        from,
        to,
        subject: "Follow-up reminder — Switalk",
        text: `You asked to be reminded about a conversation.\n\nOpen it here: ${process.env.NEXT_PUBLIC_APP_URL}/inbox/${reminder.conversation_id}`,
      });
      if (error) throw new Error(error.message);
      return { emailed: true };
    } catch (err) {
      console.error("fire-reminder: email nudge failed", err);
      return { emailed: false, reason: "send failed" };
    }
  });

  return { fired: true };
}

export const fireReminder = inngest.createFunction(
  {
    id: "fire-reminder",
    retries: 3,
    cancelOn: [
      {
        event: "reminder/cancel",
        if: "event.data.reminderId == async.data.reminderId",
      },
    ],
    triggers: [{ event: "reminder/set" }],
  },
  async ({ event, step }) =>
    fireReminderHandler({
      event: event as unknown as FireReminderEvent,
      step: step as unknown as StepTools,
    })
);
