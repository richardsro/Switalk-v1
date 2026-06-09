import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-indigo-600">Switalk</span>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      <section className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          One app instead of four.
        </h1>
        <p className="mt-4 text-lg text-zinc-600">
          Inbox, poster, CRM — under £20/month. Every WhatsApp, Instagram,
          Facebook, Telegram and email message in one feed, plus scheduled
          posting to all your socials.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/login">
            <Button size="lg">Start free trial</Button>
          </Link>
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          14 days free · no credit card · 5-minute setup
        </p>

        <dl className="mt-16 grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-3">
          {[
            ["Unified inbox", "WhatsApp, Instagram, Messenger, Telegram, email and webchat in one feed. Nothing missed."],
            ["Auto-poster", "Write once, schedule everywhere — Instagram, Facebook, and more."],
            ["Built-in CRM", "One contact card per person, with every conversation across every platform."],
          ].map(([title, body]) => (
            <div key={title}>
              <dt className="font-semibold">{title}</dt>
              <dd className="mt-1 text-sm text-zinc-500">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-zinc-400">
        Switalk — saves you £612/year vs. juggling three tools. From £5/month.
      </footer>
    </main>
  );
}
