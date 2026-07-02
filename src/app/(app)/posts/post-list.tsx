"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChannelIcon } from "@/components/channel-icon";
import { cancelPost } from "./actions";
import type { Channel, ScheduledPost } from "@/lib/types";

const STATUS_COLOR: Record<ScheduledPost["status"], "default" | "green" | "yellow" | "red" | "gray"> = {
  pending: "yellow",
  publishing: "default",
  published: "green",
  failed: "red",
  cancelled: "gray",
};

export function PostList({
  posts,
  channels,
}: {
  posts: ScheduledPost[];
  channels: Channel[];
}) {
  if (posts.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Nothing scheduled yet — write your first post above and it will appear
        here.
      </p>
    );
  }

  const channelById = new Map(channels.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="whitespace-pre-wrap text-sm">{post.content}</p>
              <Badge color={STATUS_COLOR[post.status]}>{post.status}</Badge>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="flex gap-1.5">
                  {post.channel_ids.map((id) => {
                    const ch = channelById.get(id);
                    return ch ? (
                      <ChannelIcon key={id} type={ch.type} className="h-3.5 w-3.5" />
                    ) : null;
                  })}
                </span>
                <span>
                  {format(new Date(post.scheduled_for), "d MMM yyyy, HH:mm")}
                </span>
              </div>
              {post.status === "pending" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cancelPost(post.id)}
                >
                  Cancel
                </Button>
              )}
            </div>
            {post.error && (
              <p className="mt-2 text-xs text-red-600">{post.error}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
