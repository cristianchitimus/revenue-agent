# Revenue Agent

Autonomous revenue generation system with three AI-powered engines:

1. **Content Engine** — Generates SEO articles with affiliate links, publishes to niche sites
2. **Lead Gen Engine** — Scrapes and enriches business leads, delivers to B2B subscribers
3. **Freelance Agent** — Monitors job platforms, scores opportunities, generates proposals

## Tech Stack

- Next.js (App Router, TypeScript)
- Supabase (PostgreSQL database)
- Prisma ORM
- Claude API (content generation, lead enrichment, job scoring)
- Stripe (B2B subscriptions)
- Tailwind CSS

## Getting Started

1. Clone and install: `npm install`
2. Copy `.env.example` to `.env` and fill in credentials
3. Push database schema: `npm run db:push`
4. Start dev server: `npm run dev`
5. Seed demo data: `POST http://localhost:3000/api/seed`

## API Routes

- `POST /api/engines/content` — Run content engine
- `POST /api/engines/leadgen` — Run lead gen engine
- `POST /api/engines/freelance` — Run freelance agent
- `POST /api/engines/toggle` — Enable/disable an engine
- `GET /api/cron` — Trigger all enabled engines
- `POST /api/seed` — Seed demo data
