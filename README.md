# Moonrise Studio MVP

Vanilla HTML/JS product app for freelancers: find local businesses, generate a site with AI, demo a watermarked preview, collect payment via Stripe, then publish to Vercel.

## Stack

| Service | Role |
|---------|------|
| **Supabase** | Auth + `profiles` / `projects` / `payments` / `generation_jobs` + existing `leads` |
| **OpenRouter** | Site HTML generation (via Render worker only) |
| **Stripe** | Checkout Session for “Pay to go live” |
| **Vercel** | Deploy published HTML |
| **Render** | Always-on worker (`worker/`) |

## Quick start

### 1. Database

Schema is applied to the **Moonrise Studio** Supabase project (`erfaxgmnzdropviormpj`).

To re-apply locally/elsewhere, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL editor.

Enable **Email** auth in Authentication → Providers. For local testing you can disable “Confirm email”.

Copy the **service role** key from Project Settings → API into `worker/.env` (never into frontend JS).

### 2. Frontend config

Edit [`js/config.js`](js/config.js):

- `supabaseUrl` / `supabaseAnonKey` (public)
- `workerUrl` → your local or Render worker URL

### 3. Worker

```bash
cd worker
cp .env.example .env
# fill SUPABASE_*, OPENROUTER_*, STRIPE_*, VERCEL_*, PUBLIC_APP_URL
npm install
npm start
```

Worker listens on `0.0.0.0:$PORT` (default `8787`).

### 4. Static app

```bash
# from moonrise-studio/
npx --yes serve -l 3000 .
```

Open `http://localhost:3000` → marketing home → **Apply** / Sign in → Dashboard.

### 5. Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:8787/webhooks/stripe
```

Paste the webhook signing secret into `worker/.env` as `STRIPE_WEBHOOK_SECRET`.

## Smoke test path

1. Sign up / sign in
2. **Business Finder** → **Generate** (or open **Builder** directly)
3. Pick template → **Generate site** (OpenRouter; falls back to template fill if key missing)
4. Click watermark chip → **Checkout with Stripe** (test mode)
5. After webhook, watermark clears → **Publish to Vercel**
6. Confirm URL on Builder meta

## Channels

- `index.html` — marketing home
- `apply.html` — sign in / sign up
- `dashboard.html` — metrics
- `leads.html` — Lead Finder
- `builder.html` — generate / preview / code / paywall / publish
- `course.html` — University lessons
- `settings.html` — profile + payments
- `finance.html` / `help.html` — stubs
- `store.html` — coming soon

## Deploy worker to Render

[`worker/render.yaml`](worker/render.yaml) — set env vars in the Render dashboard (same keys as `.env.example`). After deploy, set `js/config.js` `workerUrl` to the Render URL and `PUBLIC_APP_URL` to your hosted static app URL.

## Notes

- Watermark is a **separate overlay** (`js/watermark.js`), not baked into generated HTML.
- Never put OpenRouter / Stripe secret / service-role keys in frontend JS.
- If `leads` is empty, Business Finder shows demo leads.
- If `VERCEL_TOKEN` is unset, publish uses a local fallback URL so the loop can still be tested.
