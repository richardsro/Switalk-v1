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
(checkout/portal/webhook), email webhook. **Webchat is fully live end-to-end**:
creation UI + embed snippet in Settings → Channels, visitor messages ingest
via `/api/webchat`, inbox replies reach the visitor via Realtime broadcast
(`src/lib/realtime.ts`, topic `webchat:{widgetId}:{visitorId}`). Trial expiry
is enforced via `profiles.trial_ends_at` + `getEffectivePlan()` in
`src/lib/billing.ts` — use it (not raw subscription reads) in any new
quota-gated action.

Media upload (Supabase Storage `post-media` bucket) is live in the composer;
Instagram publishing is unblocked. Meta API calls are rate-limit-protected
(`src/lib/rate-limit.ts`, 180/200 hourly budget; over-budget work is queued
via Inngest). Tests: `npm test` (vitest, fully mocked) covers webhook ingest,
the publish job, rate limiting and trial expiry; `npm run test:rls` verifies
RLS against a real Supabase project. Go-live checklist: DEPLOYMENT.md.
WhatsApp numbers connect via the Meta OAuth callback (WABA ids from
`debug_token` granular scopes → app subscribed to WABA webhooks → each phone
number upserted as a `whatsapp` channel keyed by phone number id).

Not yet built: webchat history replay on widget reopen (broadcasts are lost
if the widget is closed); email channel
connect UI; sender profile enrichment (Graph lookup); LinkedIn/TikTok
adapters; follow-up reminders (CRM phase 2); team seats (Business plan).

## Business gates (context for prioritisation)

Gate 1 (month 4): ≥10 paying users. Gate 2 (month 6, critical): ≥20 paying,
MRR ≥£250, churn <15%. Optimise for activation speed: setup must take <5 min.
