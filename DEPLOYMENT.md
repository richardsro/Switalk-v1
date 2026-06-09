# Switalk — Go-Live Checklist

Everything required before real users touch this, in dependency order.
Honest time estimates assume a solo founder. Items marked **BLOCKER** stop
launch; items marked *soft* can follow in week one.

## 1. Supabase (~30 min) — BLOCKER

- [ ] Create the production project (separate from dev). Region: London (`eu-west-2`).
- [ ] Apply all 5 migrations: `npx supabase link --project-ref <ref> && npx supabase db push`
- [ ] Auth → Providers: enable **Google** (needs a Google Cloud OAuth client;
      authorised redirect = `https://<project-ref>.supabase.co/auth/v1/callback`).
- [ ] Auth → URL Configuration: Site URL = `https://app.switalk.com`; add
      `https://app.switalk.com/auth/callback` to redirect allow-list.
      **Without this, every magic link redirects to localhost.**
- [ ] Auth → Email: default Supabase SMTP is limited to ~2 emails/hour —
      fine for testing, useless for launch. Set custom SMTP (use Resend's
      SMTP gateway, free tier) or signups will appear broken.
- [ ] Run `npm run test:rls` against production. Do not skip.
- [ ] Confirm Storage bucket `post-media` exists (created by migration 0005).
- [ ] Note: free tier **pauses projects after 7 days of inactivity** — fine
      pre-launch, but check the dashboard weekly until there's real traffic.

## 2. Vercel (~20 min) — BLOCKER

- [ ] Import the repo, framework = Next.js, set the production domain
      (`app.switalk.com` CNAME → Vercel).
- [ ] Set ALL env vars from `.env.example` for Production (and Preview if
      you want preview deploys to work):
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_ID`, `META_APP_SECRET`,
      `META_VERIFY_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `RESEND_API_KEY`,
      `EMAIL_WEBHOOK_SECRET`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`,
      `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_LITE`,
      `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`,
      `NEXT_PUBLIC_APP_URL=https://app.switalk.com`
- [ ] Vercel free tier gotcha: serverless function timeout is 10s on Hobby.
      Webhooks and actions are fast, but watch the Meta OAuth callback
      (multiple Graph calls in sequence) in the logs.
- [ ] Hobby plan is **non-commercial use**. Charging money = you need Vercel
      Pro ($20/mo) sooner rather than later. Budget it — this is the first
      real infra cost and still inside the £25 ceiling.

## 3. Inngest (~15 min) — BLOCKER for the poster

- [ ] Create an Inngest Cloud account (free tier), create an app.
- [ ] Set `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` in Vercel, redeploy.
- [ ] Sync the app: Inngest dashboard → Apps → sync with
      `https://app.switalk.com/api/inngest`.
- [ ] Verify both functions appear: `publish-post`, `send-queued-message`.
- [ ] Schedule a test post 5 minutes out and watch it run.

## 4. Stripe (~45 min) — BLOCKER for revenue

- [ ] Activate the live account (business details, bank account). Until
      then you're in test mode — fine for soft launch with a free trial.
- [ ] Create 3 products with **GBP recurring monthly prices**: Lite £5,
      Pro £19, Business £49. Copy the three `price_...` ids into the
      `STRIPE_PRICE_*` env vars. **A typo here silently maps every paying
      customer to "trial"** (it's logged, but check the logs after the
      first real checkout).
- [ ] Add a webhook endpoint: `https://app.switalk.com/api/webhooks/stripe`
      with events `checkout.session.completed`,
      `customer.subscription.updated`, `customer.subscription.deleted`.
      Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.
- [ ] Enable the **Customer Portal** (Settings → Billing → Customer portal)
      — the "Manage subscription" button 500s without it.
- [ ] Set statement descriptor to SWITALK (random descriptors = chargebacks).
- [ ] Test the full loop in test mode: checkout → webhook → plan flips in
      Settings → Billing → portal cancel → plan reverts.

## 5. Telegram (~5 min) — works day one

- [ ] Set `TELEGRAM_WEBHOOK_SECRET` to a long random string. That's it —
      webhooks are registered per-bot automatically when a user connects.
- [ ] Smoke test: connect a bot, DM it, reply from the inbox.

## 6. Meta (Facebook/Instagram/WhatsApp) — the long pole: WEEKS, not hours

Brutal truth: **App Review takes 1–6 weeks and you cannot launch these
channels without it.** Plan to launch with Telegram + webchat + email and
add Meta channels when approved. Sequence:

- [ ] Create the Meta app (type: Business) at developers.facebook.com.
- [ ] Add products: Messenger, Instagram, WhatsApp, Facebook Login for Business.
- [ ] Webhooks (Messenger + Instagram + WhatsApp): callback URL
      `https://app.switalk.com/api/webhooks/meta`, verify token =
      `META_VERIFY_TOKEN`, subscribe to `messages` (+ `messaging_postbacks`).
- [ ] OAuth redirect URI allow-list:
      `https://app.switalk.com/api/channels/meta/callback`.
- [ ] **Business verification** (Meta Business Manager) — required before
      review; needs company documents. You're trading as Ready Study Global
      Ltd — use those. Allow ~1 week.
- [ ] **App Review** — request: `pages_show_list`, `pages_messaging`,
      `pages_manage_posts`, `instagram_basic`, `instagram_manage_messages`,
      `instagram_content_publish`, `whatsapp_business_messaging`,
      `whatsapp_business_management`, `business_management`.
      You must submit a **screencast of each permission in use** — record
      against your own test page (App Roles → testers can use the app
      pre-approval; that's how you demo it).
- [ ] **Privacy policy + data deletion instructions URLs are mandatory**
      for review. switalk.com/privacy and /data-deletion must exist first.
- [ ] WhatsApp: the Cloud API number onboarding (embedded signup) is NOT
      built yet — the webhook + send adapter are; channel creation for
      WhatsApp needs a settings flow. Don't promise WhatsApp at launch.
- [ ] Meta page-token expiry: long-lived page tokens don't expire, but
      tokens die if the user changes their password / revokes the app —
      there's no token-refresh/reconnect UX yet. Watch for `error` status
      channels. *soft*

## 7. Email channel (~30 min) — *soft*

- [ ] Resend: verify your sending domain (DNS records) — until then the
      email adapter can only send from `onboarding@resend.dev`.
- [ ] Inbound: point your forwarder at
      `https://app.switalk.com/api/webhooks/email` with header
      `x-webhook-secret: $EMAIL_WEBHOOK_SECRET`. There's no per-user email
      connect UI yet — treat email as beta.

## 8. Legal / business — BLOCKER (don't skip because it's boring)

- [ ] Privacy policy + Terms at switalk.com (required by Meta review AND
      UK GDPR — you're storing other people's customer messages).
- [ ] Data deletion endpoint/instructions (Meta requirement).
- [ ] Cookie notice if you add analytics.
- [ ] You're processing personal data as Ready Study Global Ltd → register
      with the ICO (~£40/yr). Genuinely required in the UK.
- [ ] VAT: not until £90k turnover, but Stripe Tax exists when you get there.

## 9. Monitoring / ops (~30 min) — launch-day essential

- [ ] Vercel log drains or at minimum check Function logs daily — every
      silent failure we hardened now logs loudly; someone has to read them.
- [ ] Set up uptime monitoring on `/` and `/api/webhooks/meta` (GET returns
      403 — that's fine, you're checking it's alive). UptimeRobot free.
- [ ] Stripe webhook delivery alerts: Stripe emails you on repeated
      failures — make sure that address is monitored.
- [ ] Supabase dashboard → Database → check table sizes weekly; free tier
      caps at 500MB. `messages.raw` JSONB is the growth risk; prune later.

## 10. Pre-launch smoke test (run every item, in production)

- [ ] Sign up with magic link; sign up with Google.
- [ ] Connect a Telegram bot; receive a DM in the inbox; reply; confirm
      delivery on the phone.
- [ ] Create a webchat widget; embed the snippet on any page; send a
      visitor message; reply from inbox; see it appear in the widget.
- [ ] Schedule a text post to a test Facebook page 5 min out; verify it
      publishes; schedule one with an image.
- [ ] Subscribe (test card 4242…), verify plan flips, cancel via portal.
- [ ] `npm run test:rls` against prod. `npm test` green. `npm run build` green.

## Known product gaps at launch (be honest in marketing)

- WhatsApp/Instagram/Messenger pending Meta review — don't sell them as live.
- Webchat: no history replay if the visitor closes and reopens the widget.
- Email: no per-user connect UI yet.
- No LinkedIn/TikTok posting (Pro tier copy says "all 6 channels" — make
  sure the pricing page matches what's actually connectable today).
- No team seats yet (don't sell Business plan, or sell it as "Pro + priority").
- Sender names on Messenger/Instagram show as numeric IDs until profile
  enrichment is built.
