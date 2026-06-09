# Switalk

Unified inbox + social auto-poster + basic CRM for solopreneurs.
**One app instead of four — under £20/month.**

- **Inbox**: WhatsApp Business, Instagram DM, Facebook Messenger, Telegram,
  Email, Webchat — one realtime feed.
- **Auto-poster**: write once, schedule to Facebook/Instagram (LinkedIn/TikTok
  phase 2) via Inngest.
- **CRM**: one contact per person across all platforms, full history.

Architecture: see [ARCHITECTURE.md](./ARCHITECTURE.md) (decision record —
built from scratch on Next.js 14 + Supabase + Vercel + Inngest, £0/mo at launch).

## Stack

| Layer | Tech | Cost at launch |
|---|---|---|
| Frontend + API | Next.js 14 (App Router, TypeScript, Tailwind) | — |
| DB + Auth + Realtime | Supabase (Postgres, RLS) | Free tier |
| Hosting | Vercel | Free tier |
| Jobs / scheduling | Inngest (`sleepUntil`) | Free tier |
| Outbound email | Resend | Free (3k/mo) |
| Payments | Stripe | Pay-per-use |

## Getting started

1. **Install**: `npm install`
2. **Supabase**: create a free project at supabase.com, then run the migration:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push        # applies supabase/migrations/0001_init.sql
   ```
   Enable the Google provider under Auth → Providers (optional).
3. **Env**: `cp .env.example .env.local` and fill in keys.
4. **Dev**: `npm run dev` (+ `npx inngest-cli@latest dev` in a second
   terminal for local job execution).
5. **Deploy**: push to GitHub → import in Vercel → set env vars → done.
   Point Meta/Telegram/Stripe webhooks at the production URL.

## Project layout

```
supabase/migrations/        SQL schema (RLS, realtime)
src/middleware.ts           Auth session refresh + route protection
src/lib/
  supabase/                 browser / server / admin clients
  channels/                 platform adapters (meta, telegram, email) + ingest
  inngest/                  job client + publish-post function
  plans.ts                  pricing tiers + plan gating
  stripe.ts                 lazy Stripe singleton
src/app/
  page.tsx                  landing page
  login/, auth/callback/    magic-link + Google OAuth
  (app)/inbox/              unified inbox + realtime thread view
  (app)/posts/              composer + scheduled post queue
  (app)/contacts/           CRM contact list
  (app)/settings/           channels (connect flows) + billing (Stripe)
  api/webhooks/             meta | telegram | email | stripe receivers
  api/channels/meta/        OAuth connect + callback
  api/inngest/              Inngest serve endpoint
  api/webchat/              webchat widget ingestion
public/widget.js            embeddable webchat snippet
```

## Channel rollout order

1. **Telegram** (no review, 2-minute connect) — live now
2. **Webchat + Email** — live now (webchat widget, inbound email webhook)
3. **Facebook / Instagram / WhatsApp** — code complete; requires Meta App
   Review (`pages_messaging`, `instagram_manage_messages`,
   `whatsapp_business_messaging`) before non-test users can connect
4. **LinkedIn / TikTok posting** — phase 2

## Plan gating (enforced server-side in `src/lib/plans.ts`)

| Plan | Price | Channels | Posts/mo | Contacts |
|---|---|---|---|---|
| Lite | £5 | 3 | 10 | 100 |
| Pro | £19 | 6 | ∞ | ∞ |
| Business | £49 | 6 + 3 seats | ∞ | ∞ |

14-day trial (full Pro features), no credit card required.
