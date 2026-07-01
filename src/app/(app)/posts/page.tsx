import { createClient } from "@/lib/supabase/server";
import { Composer } from "./composer";
import { PostList } from "./post-list";
import type { Channel, ScheduledPost } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const supabase = createClient();

  const [{ data: channels }, { data: posts }] = await Promise.all([
    supabase
      .from("channels")
      .select("*")
      .eq("status", "active")
      .in("type", ["facebook", "instagram", "linkedin", "tiktok"]),
    supabase
      .from("scheduled_posts")
      .select("*")
      .order("scheduled_for", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Posts</h1>
        <p className="text-sm text-gray-500">
          Write once, schedule everywhere.
        </p>
      </header>

      <Composer channels={(channels ?? []) as Channel[]} />

      <h2 className="mb-3 mt-8 font-bold text-gray-900">Scheduled & published</h2>
      <PostList
        posts={(posts ?? []) as ScheduledPost[]}
        channels={(channels ?? []) as Channel[]}
      />
    </div>
  );
}
