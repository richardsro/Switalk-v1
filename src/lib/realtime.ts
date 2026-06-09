/**
 * Server-side Supabase Realtime broadcast via the HTTP API — no websocket
 * connection needed. Used to push inbox replies out to webchat visitors.
 */
export async function broadcast(
  topic: string,
  event: string,
  payload: unknown
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ messages: [{ topic, event, payload }] }),
  });
  if (!res.ok) {
    throw new Error(`Realtime broadcast failed (${res.status})`);
  }
}

/** Topic a webchat visitor subscribes to. Ids are unguessable UUIDs. */
export function webchatTopic(widgetId: string, visitorId: string): string {
  return `webchat:${widgetId}:${visitorId}`;
}
