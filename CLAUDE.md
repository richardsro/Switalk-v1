# CLAUDE.md — Switalk

SaaS unified inbox + social auto-poster + basic CRM for solopreneurs.
Pricing £5 (Lite) / £19 (Pro) / £49 (Business) per month, 14-day free trial.
Core promise: **nothing missed** — every message from every platform in one feed.

## Architecture (decided — see ARCHITECTURE.md)

Built from scratch: **Next.js 14 App Router + Supabase + Vercel + Inngest +
Resend + Stripe**. No Chatwoot, no Bird/MessageBird — the whole stack must run
on free tiers (£0/mo at launch, £25/mo ceiling).

Flow: platform webhooks → `src/app/api/webhooks/*` → normalise via
`ingestInboundMessage()` → Postgres (RLS per user) → Supabase Realtime → UI.
Outbound: channel adapters in `src/lib/channels/`. Scheduled posts: Inngest
`sleepUntil` in `src/lib/inngest/functions/publish-post.ts`.

## Conventions

- Server Components by default; `"use client"` only where interactivity needs it.
- Mutations are server actions (`actions.ts` next to the page), validated with zod.
- Supabase clients: `client.ts` (browser), `server.ts` (RSC/actions, RLS
  applies), `admin.ts` (service role — **webhooks and Inngest jobs only**).
- Plan limits live in `src/lib/plans.ts` and are enforced **server-side** in
  actions, never only in UI.
- Webhook routes must stay idempotent (unique `(channel_id, external_id)`;
  treat Postgres error 23505 as already-ingested) and return 200 fast.
- UI: Tailwind, hand-rolled shadcn-style primitives in `src/components/ui/`,
  mobile-first (bottom tab bar < md, sidebar ≥ md), indigo accent.
- DB changes = new numbered file in `supabase/migrations/`, RLS on every table.

## Commands

- `npm run dev` — app; `npx inngest-cli@latest dev` — local job runner
- `npm run build` — must stay green; `npm run lint`

## Current state / next steps

Scaffold complete: auth (magic link + Google), inbox (list + realtime thread +
reply), poster (composer + Inngest publish), contacts, channel connect
(Telegram live; Meta OAuth coded, needs App Review), Stripe billing
(checkout/portal/webhook), webchat widget, email webhook.

Not yet built: media upload for posts (Supabase Storage), webchat widget
creation UI, sender profile enrichment (Graph lookup), LinkedIn/TikTok
adapters, follow-up reminders (CRM phase 2), team seats (Business plan).

## Business gates (context for prioritisation)

Gate 1 (month 4): ≥10 paying users. Gate 2 (month 6, critical): ≥20 paying,
MRR ≥£250, churn <15%. Optimise for activation speed: setup must take <5 min.
