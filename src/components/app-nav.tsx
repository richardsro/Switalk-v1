"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Send, Users, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/posts", label: "Posts", icon: Send },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Bottom tab bar on mobile, left sidebar on md+. Mobile-first by design. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-gray-200 bg-white p-4 md:flex">
        <Link href="/inbox" className="mb-8 px-2">
          <Logo className="text-xl" />
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
                pathname.startsWith(href)
                  ? "bg-brand-50 text-brand-600"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold",
              pathname.startsWith(href) ? "text-brand-600" : "text-gray-500"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
