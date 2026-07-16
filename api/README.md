# API surface (Render worker)

Base URL: `SITE_CONFIG.workerUrl`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | no | Health check |
| POST | `/generate` | Bearer (Supabase JWT) | OpenRouter HTML → `projects` |
| POST | `/checkout` | Bearer | Create Stripe Checkout Session |
| POST | `/webhooks/stripe` | Stripe signature | Unlock watermark + record payment |
| POST | `/publish` | Bearer | Deploy HTML to Vercel |

All mutating routes except the Stripe webhook require `Authorization: Bearer <access_token>` from Supabase Auth.
