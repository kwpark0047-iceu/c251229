# economy-news — Code Conventions (read-only policy for aider)

This file is auto-loaded by aider (`read:` in `.aider.conf.yml`). It is a
read-only context file — do not treat it as a file to modify.

## Mandatory pre-work

- Read any project-local `AGENTS.md` / `CLAUDE.md` / `.cursorrules` before
  editing if present.
- **Next.js 16.2.10** + **React 19.2.4** — NOT the version you know. Read
  `node_modules/next/dist/docs/` before editing anything Next.js-related.

## Workspace rules

- Package manager: **npm ONLY** (`npm run dev` / `npm run build` /
  `npm run lint` / `npm run start`).
- Stack: Next.js App Router, React 19, Prisma ORM, rss-parser, node-cron.

## Project rules

- **Prisma**: schema at `prisma/schema.prisma` — models: Article, Source,
  FetchLog. SQLite in dev, PostgreSQL in prod (`DATABASE_URL`). After any
  schema change run `npm run db:generate` then `npm run db:push`. Migration:
  `npm run db:migrate`.
- **Data collection**: rss-parser for feeds (한국경제, 매일경제, Federal
  Reserve), node-cron schedules collection every 3 hours. Standalone cron
  worker at `worker/index.ts` for production; `npm run worker` / `npm run
  fetch` (manual trigger) / `npm run db:seed` (seed) / `npm run db:studio`.
- **API conventions**: routes return `{ success, data }` shape — do NOT throw
  for expected failures. Existing routes: `/api/cron`, `/api/articles`,
  `/api/sources`, `/api/health` (plus ai-it, financial).
- **Deploy**: Railway via `railway.json` (Nixpacks builder, health check at
  `/api/health`, pre-deploy `prisma db push`). Env: `DATABASE_URL`,
  `CRON_SECRET` (API auth), `NEXT_PUBLIC_BASE_URL`.
- Source layout: `src/app/` (domestic, overseas, all, api routes),
  `src/components/` (NewsList, NewsCard, Sidebar, Header + ai-it/financial
  components), `src/lib/rss/` (fetcher, db-service, sources, service).
- Match existing patterns; Korean content sources are primary.