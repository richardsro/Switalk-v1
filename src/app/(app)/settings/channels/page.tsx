import { createClient } from "@/lib/supabase/server";
import { ChannelManager } from "./channel-manager";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("channels")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Channels</h1>
        <p className="text-sm text-gray-500">
          Connect the places your customers message you.
        </p>
      </header>
      <ChannelManager
        channels={(data ?? []) as Channel[]}
        flashError={searchParams.error}
        flashConnected={searchParams.connected}
      />
    </div>
  );
}
