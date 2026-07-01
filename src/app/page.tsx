import Link from "next/link";
import {
  ArrowDown,
  Check,
  Clock,
  Crosshair,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ChannelIcon } from "@/components/channel-icon";
import { cn } from "@/lib/utils";
import type { ChannelType } from "@/lib/types";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-sm font-bold uppercase tracking-[0.2em] text-brand-500">
      {children}
    </p>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-balance text-center text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
      {children}
    </h2>
  );
}

const PROBLEMS = [
  {
    icon: MessagesSquare,
    title: "Messages everywhere",
    body: "Instagram here, WhatsApp there, email somewhere else. Context gets lost between platforms.",
  },
  {
    icon: Clock,
    title: "Forgotten follow-ups",
    body: "You meant to reply yesterday. Now it's been a week. The deal is gone.",
  },
  {
    icon: Crosshair,
    title: "Lost revenue",
    body: "Every missed message is a missed opportunity. You're losing money from disorganization, not lack of demand.",
  },
];

const CHANNELS: Array<{ type: ChannelType; label: string; color: string }> = [
  { type: "whatsapp", label: "WhatsApp", color: "text-channel-whatsapp" },
  { type: "instagram", label: "Instagram", color: "text-channel-instagram" },
  { type: "facebook", label: "Messenger", color: "text-channel-messenger" },
  { type: "telegram", label: "Telegram", color: "text-channel-telegram" },
  { type: "email", label: "Email", color: "text-channel-email" },
  { type: "webchat", label: "Webchat", color: "text-channel-webchat" },
];

const STEPS = [
  {
    title: "Connect your channels",
    body: "Link WhatsApp, Instagram, and more in under 5 minutes. No technical skills needed.",
  },
  {
    title: "All messages in one place",
    body: "Every conversation from every platform appears in your unified inbox.",
  },
  {
    title: "Never miss a follow-up",
    body: "Set reminders, use templates, and close more deals with less effort.",
  },
];

const PLANS = [
  {
    name: "Lite",
    price: 5,
    tagline: "Perfect for getting started",
    features: [
      "3 connected channels",
      "10 scheduled posts/month",
      "100 contacts",
      "Unified inbox",
    ],
  },
  {
    name: "Pro",
    price: 19,
    tagline: "Everything you need to grow",
    features: [
      "All 6 channels",
      "Unlimited scheduled posts",
      "Unlimited contacts",
      "Priority support",
      "Advanced analytics",
    ],
    highlight: true,
  },
  {
    name: "Business",
    price: 49,
    tagline: "For growing businesses",
    features: [
      "Everything in Pro",
      "2–3 team members",
      "Future add-ons included",
      "Dedicated account manager",
    ],
  },
];

const FAQS = [
  {
    q: "How long does setup take?",
    a: "Under 5 minutes. Connect your channels with a few clicks — no coding, no IT team needed.",
  },
  {
    q: "Do I need a WhatsApp Business API account?",
    a: "We'll guide you through the setup. It takes about 10 minutes and is completely free.",
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. Every plan comes with a 14-day free trial. No credit card required.",
  },
  {
    q: "What happens to my existing conversations?",
    a: "New messages start flowing in immediately. We don't import old history — you start fresh with a clean inbox.",
  },
  {
    q: "Is my data secure?",
    a: "Your conversations are encrypted and stored securely. We never read, sell, or share your data. GDPR compliant.",
  },
];

export default function LandingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-100 bg-white/90 px-6 py-4 backdrop-blur">
        <Logo className="text-xl" />
        <Link href="/login">
          <Button variant="outline" size="sm">
            Sign in
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-2xl px-6 pb-16 pt-16 text-center sm:pt-24">
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Stop losing clients to missed messages.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-gray-500">
          One inbox for all your conversations — with auto-posting and a simple
          CRM. Built for solopreneurs. Under £20/mo.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/login">
            <Button size="lg">Start free trial</Button>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-1 text-base font-semibold text-gray-500 hover:text-gray-900"
          >
            See how it works <ArrowDown className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">
          14 days free · no credit card · 5-minute setup
        </p>

        {/* Inbox mockup */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm">
          <div className="relative flex items-center gap-1.5 border-b border-gray-100 bg-gray-50 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="absolute inset-x-0 text-center text-sm font-semibold text-gray-600">
              switalk inbox
            </span>
          </div>
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-channel-whatsapp text-sm font-bold text-white">
              W
            </span>
            <div>
              <p className="font-bold text-gray-900">Sarah M.</p>
              <p className="text-sm text-gray-400">via WhatsApp</p>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-900 sm:max-w-[70%]">
              Hey, is the coaching slot still available for next week?
              <span className="mt-1 block text-center text-[10px] text-gray-400">
                10:32 AM
              </span>
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-brand-500 px-4 py-2.5 text-sm text-white sm:max-w-[70%]">
              Hi Sarah! Yes, I have Tuesday at 3pm or Thursday at 11am. Which
              works best?
              <span className="mt-1 block text-center text-[10px] text-orange-100">
                10:35 AM
              </span>
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-900 sm:max-w-[70%]">
              Thursday at 11am is perfect! How do I pay?
              <span className="mt-1 block text-center text-[10px] text-gray-400">
                10:36 AM
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* The problem */}
      <section className="w-full px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <Eyebrow>The problem</Eyebrow>
          <H2>
            Your clients message you on 5 platforms. You lose track of half of
            them.
          </H2>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PROBLEMS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-white p-6"
              >
                <Icon className="h-8 w-8 text-brand-500" strokeWidth={1.75} />
                <h3 className="mt-4 text-lg font-bold text-gray-900">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The fix */}
      <section className="w-full bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>The fix</Eyebrow>
          <H2>Six channels. One inbox. Zero chaos.</H2>
          <div className="mt-8 flex flex-wrap items-start justify-center gap-x-8 gap-y-5">
            {CHANNELS.map(({ type, label, color }) => (
              <div key={type} className="flex flex-col items-center gap-1.5">
                <ChannelIcon type={type} className={cn("h-7 w-7", color)} />
                <span className="text-sm text-gray-500">{label}</span>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-xl text-center text-lg text-gray-500">
            One contact = all their conversations, regardless of channel.
            Complete history. Follow-up reminders. Nothing more.
          </p>

          {/* Contact card mockup */}
          <div className="mt-10 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 font-bold text-white">
                SM
              </span>
              <div>
                <p className="font-bold text-gray-900">Sarah Mitchell</p>
                <p className="text-sm text-gray-400">
                  4 conversations across 3 channels
                </p>
              </div>
            </div>
            {[
              {
                dot: "bg-channel-whatsapp",
                channel: "WhatsApp",
                when: "Today, 10:36 AM",
                text: "Thursday at 11am is perfect! How do I pay?",
              },
              {
                dot: "bg-channel-instagram",
                channel: "Instagram",
                when: "Yesterday, 3:12 PM",
                text: "Love your latest post! Do you offer 1-on-1 coaching?",
              },
              {
                dot: "bg-channel-email",
                channel: "Email",
                when: "3 days ago",
                text: "Hi, I saw your website and wanted to ask about your programs...",
              },
            ].map(({ dot, channel, when, text }) => (
              <div key={channel} className="flex gap-3 pt-4">
                <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", dot)} />
                <div>
                  <p className="text-sm text-gray-400">
                    <span className="font-bold text-gray-900">{channel}</span>
                    {" · "}
                    {when}
                  </p>
                  <p className="mt-0.5 text-gray-700">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="w-full px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <H2>Three steps. Five minutes. Done.</H2>
          <div className="mt-12 flex flex-col gap-12">
            {STEPS.map(({ title, body }, i) => (
              <div key={title} className="flex flex-col items-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-xl font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-xl font-bold text-gray-900">{title}</h3>
                <p className="mt-2 max-w-md text-gray-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="w-full bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>Simple pricing</Eyebrow>
          <H2>Simple pricing. No surprises.</H2>
          <p className="mt-4 text-center text-lg text-gray-500">
            Every plan includes a 14-day free trial. No credit card required.
          </p>
          <div className="mt-12 flex flex-col gap-8">
            {PLANS.map(({ name, price, tagline, features, highlight }) => (
              <div key={name} className="relative">
                {highlight && (
                  <span className="absolute -top-3.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-brand-500 px-5 py-1.5 text-sm font-bold uppercase tracking-wider text-white">
                    Most popular
                  </span>
                )}
                <div
                  className={cn(
                    "rounded-2xl bg-white p-8 text-center",
                    highlight
                      ? "border-2 border-brand-500"
                      : "border border-gray-200"
                  )}
                >
                  <h3 className="text-xl font-bold text-gray-900">{name}</h3>
                  <p className="mt-3">
                    <span className="text-5xl font-extrabold tracking-tight text-gray-900">
                      £{price}
                    </span>
                    <span className="text-base font-medium text-gray-400">
                      /month
                    </span>
                  </p>
                  <p className="mt-4 text-gray-500">{tagline}</p>
                  <ul className="mt-6 divide-y divide-gray-100 text-left">
                    {features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-3 py-3 text-gray-600"
                      >
                        <Check className="h-4 w-4 shrink-0 text-brand-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className="mt-6 block">
                    <Button
                      variant={highlight ? "default" : "outline"}
                      size="lg"
                      className="w-full"
                    >
                      Start free trial
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cost comparison */}
      <section className="w-full px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>Replace 3 subscriptions with 1.</Eyebrow>
          <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {[
              ["Multichannel inbox", "(Crisp)", "£35"],
              ["Auto-poster, 5 channels", "(Buffer)", "£20"],
              ["CRM", "(HubSpot Starter)", "£15"],
            ].map(([tool, vendor, price]) => (
              <div
                key={tool}
                className="flex items-center justify-between border-b border-gray-100 px-5 py-4"
              >
                <div>
                  <p className="font-bold text-gray-900">{tool}</p>
                  <p className="text-sm text-gray-400">{vendor}</p>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {price}
                  <span className="text-sm font-medium text-gray-400">/mo</span>
                </p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-gray-50 px-5 py-4">
              <p className="font-bold text-gray-600">Total without Switalk</p>
              <p className="text-lg font-bold text-gray-500 line-through decoration-red-500">
                £70<span className="text-sm font-medium">/mo</span>
              </p>
            </div>
          </div>
          <div className="my-6 flex justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white">
              <ArrowDown className="h-5 w-5" />
            </span>
          </div>
          <div className="rounded-2xl border-2 border-brand-500 bg-white p-8 text-center">
            <h3 className="text-xl font-bold text-gray-900">Switalk Pro</h3>
            <p className="mt-3">
              <span className="text-5xl font-extrabold tracking-tight text-brand-500">
                £19
              </span>
              <span className="text-base font-medium text-gray-400">/mo</span>
            </p>
            <p className="mt-3 text-lg font-semibold text-green-600">
              Save up to £612 a year.
            </p>
          </div>
          <p className="mt-6 text-center text-sm italic text-gray-400">
            Based on Crisp Mini, Buffer Essentials 5 channels, HubSpot Starter
            1 seat. Prices converted to GBP. February 2026.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <Eyebrow>Questions</Eyebrow>
          <H2>Frequently asked questions</H2>
          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-gray-900 [&::-webkit-details-marker]:hidden">
                  {q}
                  <ArrowDown className="h-5 w-5 shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-gray-500">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Dark CTA */}
      <section className="w-full bg-gray-950 px-6 py-16">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <h2 className="text-balance text-3xl font-extrabold tracking-tight text-white">
            One app instead of four.
          </h2>
          <p className="mt-3 text-gray-400">
            14 days free · no credit card · 5-minute setup
          </p>
          <Link href="/login" className="mt-8 w-full">
            <Button size="lg" className="h-auto w-full whitespace-normal py-3">
              Start free trial — lock in launch pricing →
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-6 px-6 py-10">
        <Logo className="text-lg" />
        <nav className="flex gap-8 text-sm text-gray-500">
          <a href="#how-it-works" className="hover:text-gray-900">
            Features
          </a>
          <a href="#pricing" className="hover:text-gray-900">
            Pricing
          </a>
          <a href="#faq" className="hover:text-gray-900">
            FAQ
          </a>
          <a href="mailto:hello@switalk.com" className="hover:text-gray-900">
            Contact
          </a>
        </nav>
        <p className="text-xs text-gray-400">
          © 2026 Switalk Ltd. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
