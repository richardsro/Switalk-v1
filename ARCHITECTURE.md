# Switalk — Architecture Decision Record

**Date:** 2026-06-09 · **Status:** Accepted · **Decision: Option A — build from scratch**

## Context

Three options were evaluated for the Switalk MVP (unified inbox + auto-poster +
basic CRM for solopreneurs), under hard constraints: solo part-time founder,
£100-200 initial budget, **£0-25/month infrastructure at launch**, must run on
Vercel + Supabase free tiers, gross margin target 93-98%.

## Options considered

### Option A — Build from scratch ✅ CHOSEN
Next.js 14 (App Router) + Supabase + Vercel + Inngest + Meta APIs + Resend + Stripe.

### Option B — Chatwoot as inbox engine ❌
- Chatwoot is a Ruby on Rails monolith requiring **Postgres + Redis + Sidekiq
  on an always-on server** — realistically £20-40/month from day one. That
  alone consumes or exceeds the entire infra budget and *cannot* run on the
  Vercel/Supabase free tiers (hard constraint violated).
- You still build the custom Switalk frontend AND the entire auto-poster — so
  it saves only the inbox backend while adding a second stack (Ruby) the
  founder doesn't write, plus upgrade/ops burden of a ~400k-LOC app.
- Chatwoot's agent/team/helpdesk model is heavyweight for the solopreneur ICP
  ("keep it brutally simple").

### Option C — Bird (MessageBird) hybrid ❌
- **Per-message/per-contact pricing attacks the 93-98% margin target
  directly**; a £5/month Lite user with real WhatsApp volume can go
  margin-negative. Bird's pricing also carries monthly minimums (~$45+/mo),
  busting the £0-25 budget before the first customer.
- "Migrate to native APIs post-validation" = building every channel
  integration **twice**, the most expensive possible plan for a solo founder.
- Critical dependency on a third party's pricing and account approval.

## Why A wins

1. **£0/month at launch** — Vercel free + Supabase free + Inngest free +
   Resend free (3k emails/mo) + Stripe (pay-per-use). The channel APIs
   themselves (Meta Graph/WhatsApp Cloud/Telegram Bot) are free. Scales to
   ~£40/mo (Vercel Pro + Supabase Pro) at 1,000 users — inside the
   £100-250/mo target with ~97% gross margin.
2. **The inbox core is small**: webhooks → normalise → one `messages` table →
   Supabase Realtime → UI. The hard part of Chatwoot (agents, teams, SLAs,
   automations) is exactly what Switalk *doesn't* need.
3. **One stack, one deploy, no servers** — the only sustainable shape for a
   part-time solo founder. AI-assisted development collapses the
   "more dev time upfront" downside that originally justified B and C.
4. **Clean exit path** — a single coherent TypeScript codebase is what a
   micro-acquirer on Acquire.com wants to see (relevant to the Gate-2 kill
   criteria).

## Consequences

- We own Meta app review (required for IG/WhatsApp permissions in production
  regardless of option — Chatwoot/Bird don't remove this for a SaaS).
- Telegram + webchat + email ship first (no review gate) so the product is
  demoable while Meta review runs in parallel.
- Postiz (MIT) is the reference for poster patterns; we copy patterns, not the
  runtime (it needs Redis — same infra problem as Chatwoot).

## System shape

```
Channels (Meta / Telegram / Email / Webchat)
        │  webhooks (free, push-based)
        ▼
Next.js API routes  ──normalise──►  Supabase Postgres (RLS)
   on Vercel                            │  Realtime
        │                               ▼
   Inngest (sleepUntil)            Next.js App Router UI
        │  publish at T                 (mobile-first)
        ▼
Channel adapters (Graph API / Bot API / Resend)
```
