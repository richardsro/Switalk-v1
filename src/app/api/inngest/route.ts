import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { publishPost } from "@/lib/inngest/functions/publish-post";
import { sendQueuedMessage } from "@/lib/inngest/functions/send-queued-message";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [publishPost, sendQueuedMessage],
});
