"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { addMinutes, format } from "date-fns";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHANNEL_DOT_CLASS, CHANNEL_LABELS } from "@/components/channel-icon";
import { cn } from "@/lib/utils";
import { schedulePost } from "./actions";
import type { Channel } from "@/lib/types";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function Composer({ channels }: { channels: Channel[] }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [when, setWhen] = useState(
    format(addMinutes(new Date(), 60), "yyyy-MM-dd'T'HH:mm")
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function pickFiles(picked: FileList | null) {
    if (!picked) return;
    const images = Array.from(picked).filter((f) => f.type.startsWith("image/"));
    if (images.some((f) => f.size > MAX_IMAGE_BYTES)) {
      setError("Images must be 5MB or smaller");
      return;
    }
    setError(null);
    setFiles((prev) => [...prev, ...images].slice(0, MAX_IMAGES));
  }

  async function uploadImages(): Promise<string[]> {
    if (files.length === 0) return [];
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");

    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file, { contentType: file.type });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      const { data } = supabase.storage.from("post-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    let mediaUrls: string[];
    try {
      mediaUrls = await uploadImages();
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Image upload failed");
      return;
    }

    const result = await schedulePost({
      content: content.trim(),
      channelIds: selected,
      scheduledFor: new Date(when).toISOString(),
      mediaUrls,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong");
      return;
    }
    setContent("");
    setSelected([]);
    setFiles([]);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New post</CardTitle>
      </CardHeader>
      <CardContent>
        {channels.length === 0 ? (
          <p className="text-sm text-gray-500">
            Connect a posting channel (Facebook or Instagram) in Settings →
            Channels to start scheduling.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What do you want to share?"
              rows={4}
              required
            />

            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((file, i) => (
                  <div key={i} className="relative h-20 w-20">
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-20 w-20 rounded-xl border border-gray-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  pickFiles(e.target.files);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={files.length >= MAX_IMAGES}
              >
                <ImagePlus className="h-4 w-4" />
                Add images ({files.length}/{MAX_IMAGES})
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => toggle(ch.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold",
                    selected.includes(ch.id)
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      CHANNEL_DOT_CLASS[ch.type]
                    )}
                  />
                  {ch.name || CHANNEL_LABELS[ch.type]}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="sm:max-w-[220px]"
                required
              />
              <Button
                type="submit"
                disabled={busy || !content.trim() || selected.length === 0}
              >
                {busy ? "Scheduling…" : "Schedule post"}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
