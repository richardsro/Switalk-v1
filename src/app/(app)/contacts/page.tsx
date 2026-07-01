import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import type { Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const contacts = (data ?? []) as Contact[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Contacts</h1>
        <p className="text-sm text-gray-500">
          One card per person — every platform, every conversation.
        </p>
      </header>

      {contacts.length === 0 ? (
        <p className="text-sm text-gray-500">
          Contacts are created automatically when someone messages you.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                  {contact.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{contact.name}</p>
                  <p className="truncate text-xs text-gray-500">
                    {Object.entries(contact.handles)
                      .map(([platform, handle]) => `${platform}: ${handle}`)
                      .join(" · ") || "No linked handles"}
                  </p>
                </div>
                {contact.last_seen_at && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(contact.last_seen_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
