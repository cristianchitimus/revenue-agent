# Freelance Agent

Autonomous agentic freelance job scanner + proposal generator.

Scans 7 Tier-A platforms every 6 hours, scores each job 0-100 against your profile, and generates tailored proposals with Claude on demand.

## Platforms (V1 / Tier A)

| Platform | Method | Auth required |
|---|---|---|
| Remote OK | JSON API | No |
| We Work Remotely | RSS (5 category feeds) | No |
| Remotive | JSON API | No |
| Himalayas | JSON API | No |
| Hacker News "Who is hiring" | Algolia search API | No |
| Reddit (r/forhire, r/jobbit, r/remotejs, r/designjobs, r/hireanartist, r/slavelabour) | OAuth2 script app | Yes |
| Upwork (public search RSS) | RSS | No |

## Stack

- Next.js 14 (App Router, TypeScript)
- Prisma + Supabase PostgreSQL
- Tailwind CSS
- Anthropic Claude (Sonnet 4.6) for proposals
- Vercel hosting + Vercel Cron (every 6h)

## Setup

### 1. Environment variables (in Vercel → Settings → Environment Variables)

Required:

```
DATABASE_URL          = Supabase pooled connection (postgresql://...?pgbouncer=true)
DIRECT_URL            = Supabase direct connection (postgresql://...:5432/postgres)
ANTHROPIC_API_KEY     = sk-ant-...
CRON_SECRET           = random string (generate: openssl rand -hex 32)
NEXT_PUBLIC_SITE_URL  = https://your-app.vercel.app
```

Reddit (optional but recommended — Reddit is a strong source of direct client hires):

```
REDDIT_CLIENT_ID      = from https://www.reddit.com/prefs/apps (choose "script" type)
REDDIT_CLIENT_SECRET  = same page
REDDIT_USERNAME       = your Reddit username
REDDIT_PASSWORD       = your Reddit password
REDDIT_USER_AGENT     = "freelance-agent/1.0 by YourUsername"
```

### 2. Database

On first deploy, `npx prisma db push` runs automatically via the build script. To seed platform rows:

```bash
npm run db:seed
```

You can also run this locally once with your `DATABASE_URL` set to your Supabase DB.

### 3. Configure your profile

After first deploy, go to `/settings` and fill in:
- Skills (primary + secondary)
- Bio (used verbatim in proposals — be specific about past wins)
- Min budget + exclude keywords
- Hourly rate

### 4. Trigger first scan

Click "Scan Now" on the dashboard. The first scan takes ~30-60 seconds (it pulls from 7 sources sequentially).

Cron then runs every 6h automatically. On Vercel Hobby you get 2 daily crons; 6h = 4 runs/day which fits under the limit when accounting for the cron as "scheduled every 6h" (Vercel counts this as one cron definition).

## Key files

```
lib/scrapers/          One file per source, all returning normalized ScrapedJob[]
lib/scoring.ts         0-100 scoring (skills 50, budget 20, category 15, include 10, fresh 5)
app/api/scan           Manual scan trigger (POST)
app/api/cron           Scheduled scan (GET, auth via CRON_SECRET)
app/api/proposal       Generates proposal via Claude Sonnet
app/api/jobs           Job list + status updates
app/api/settings       Profile CRUD
app/page.tsx           Dashboard
app/jobs/              Job list + detail + proposal generation
app/settings/          Profile editor
app/proposals/         All generated proposals
```

## How scoring works

For each job, compute:

- **Skill match** (0-50): primary skill hit = 8pt, secondary = 3pt, capped at 50
- **Budget fit** (0-20): at or above minBudget = 20pt, half = 10pt, unknown = 8pt neutral
- **Category fit** (0-15): "both" fullstack+design = 15pt, single category = 12pt
- **Include keywords** (0-10): 5pt per hit, capped at 10
- **Freshness** (0-5): <24h = 5pt, <72h = 3pt
- **Exclude keywords**: instant 0 if matched

Jobs are indexed by matchScore + postedAt for fast sorted retrieval.

## Adding more platforms (Tier B, later)

1. Create `lib/scrapers/{platform}.ts` that exports a function returning `ScrapeResult`
2. Add it to the `SCRAPERS` array in `lib/scrapers/index.ts`
3. Add the platform slug to `prisma/seed.ts` and re-seed

Candidates for Tier B:
- Freelancer.com (official API, needs OAuth app approval ~1 week)
- Wellfound / AngelList
- Contra (requires Playwright scraper)
- Guru (Cheerio scrape — server-rendered HTML)

## License

Private / personal use.
