import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plug, CreditCard, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function signOut() {
  "use server";
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">{user?.email}</p>
      </header>

      <Card className="divide-y divide-gray-100">
        <Link
          href="/settings/channels"
          className="flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <Plug className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Channels</p>
            <p className="text-sm text-gray-500">
              Connect WhatsApp, Instagram, Facebook, Telegram, email
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
        <Link
          href="/settings/billing"
          className="flex items-center gap-3 p-4 hover:bg-gray-50"
        >
          <CreditCard className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Plan & billing</p>
            <p className="text-sm text-gray-500">
              Manage your subscription
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-50"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            <p className="font-semibold text-red-600">Sign out</p>
          </button>
        </form>
      </Card>
    </div>
  );
}
