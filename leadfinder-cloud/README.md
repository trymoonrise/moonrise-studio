# LeadFinder Cloud

Hands-free Google Maps lead scraper. Same seed file + scrape idea as the Chrome LeadFinder extension, but driven by Playwright and posts **CSV batches of 1,000 new leads** to Discord.

**Prefer local?** Use the desktop app (tray + CustomTkinter panel) - no Render needed:

- Double-click [`desktop/Start LeadFinder.cmd`](desktop/Start%20LeadFinder.cmd)
- Details: [`desktop/README.md`](desktop/README.md)

**Prefer cloud?** Use Render Cron below so your PC can stay off.

## What it does

1. Every hour (UTC), runs `node src/cloudRun.js`
2. Scrapes the next N category×city searches from `seeds/prefix_suffix_groups.txt`
3. Dedupes against previously Discord-delivered leads
4. Appends new leads to `data/all-leads.csv` during the run
5. When the pending buffer hits **1,000**, sends one Discord message with a CSV attachment
6. Saves progress so leftover leads (&lt;1000) carry to the next hour

## Security

Your Discord webhook URL is a secret. Put it only in Render env vars / local `.env`.  
**If you pasted it in chat, rotate it** in Discord → Channel → Integrations → Webhooks → regenerate.

## On-demand search scrape (Business Finder)

Separate from the hourly seed cron. Scrapes one Maps query for a business type + location, uploads into `public.leads`, and can be called from Moonrise Studio.

```powershell
cd LeadFinderCloud

# One-shot CLI
npm run search -- --type="Gyms" --location="Austin, TX"

# Local API for Business Finder (keep running)
npm run search:server
# POST http://127.0.0.1:8790/search  { "type": "Gyms", "location": "Austin, TX" }
```

Studio config: `SITE_CONFIG.leadFinderUrl` (default `http://127.0.0.1:8790`). When set, Find businesses runs a live scrape first, then falls back to Supabase search.

## Local test

```powershell
cd "LeadFinderCloud"
copy .env.example .env
# edit .env - set DISCORD_WEBHOOK_URL

npm install
npx playwright install chromium   # if not using Docker image browsers

# Smoke-test Discord only
npm run test:discord

# Dry run (no browser)
npm run dry-run

# Real scrape of 1 search
node src/cloudRun.js --limit=1
```

## Deploy on Render

1. Push repo to GitHub (include `LeadFinderCloud/`)
2. [Render](https://dashboard.render.com) → **New** → **Blueprint** → select repo
3. Root / blueprint file: `LeadFinderCloud/render.yaml`
4. Set secrets:
   - `DISCORD_WEBHOOK_URL`
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (recommended)
5. In Supabase → Storage → create private bucket **`leadfinder-cloud`**  
   (holds `cloud-state.json` so cron runs remember `nextIndex` + Discord pending buffer)
6. Trigger a manual run from the Cron service to verify Discord delivery

### Why Supabase Storage?

Render **Cron Jobs cannot attach persistent disks**. Without remote state, every hourly run would forget progress and re-send leftovers. The scraper always writes local `data/` during a run; between runs it loads/saves state from that bucket when Supabase credentials are set.

## Env vars

| Variable | Default | Meaning |
|----------|---------|---------|
| `DISCORD_WEBHOOK_URL` | - | Required |
| `QUERIES_PER_RUN` | `3` | Maps searches per cycle |
| `SCRAPE_EVERY_TIME` | `1` | Always scrape (never skip the schedule) |
| `MAX_SCROLLS` | `220` | Max results-panel scrolls per search |

## Discord format

**Strict rule:** leads go straight into Supabase `public.leads`. Every **1,000** successful uploads, Discord gets a text notice only (no CSV):

> **LeadFinder** - batch **#12**  
> 1,000 leads have been uploaded into your database.
