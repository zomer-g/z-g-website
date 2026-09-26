# Z-G | Guy Zomer — Attorney & Civic-Tech Website

The website of Guy Zomer, a criminal-defense and freedom-of-information attorney. It is two things at once: the office's site (practice areas, articles, a blog, press coverage) and a home for public legal-data tools — searchable court-ruling dashboards, Attorney-General guidelines, conditional-arrangement records, browser extensions and two MCP servers that let AI assistants read the site's legal content.

**Live:** [www.z-g.co.il](https://www.z-g.co.il)

## Contents

- [Tech stack](#tech-stack)
- [What's on the site](#whats-on-the-site)
- [MCP servers](#mcp-servers)
- [Admin panel](#admin-panel)
- [Files and uploads](#files-and-uploads)
- [Data sources and sync jobs](#data-sources-and-sync-jobs)
- [Deployment (xhostd)](#deployment-xhostd)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [Tests](#tests)
- [Project structure](#project-structure)

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack), React, TypeScript
- **Database:** PostgreSQL 18 + Prisma 7 (client generated to `src/generated/prisma`)
- **Auth:** NextAuth v5 with Google sign-in; admins are listed in `ADMIN_EMAILS`
- **Editor:** TipTap (ProseMirror) with custom `infoBlock` and `lawBlock` nodes
- **Styling:** Tailwind CSS 4, RTL-first, WCAG 2.1 AA
- **AI:** OpenAI (embeddings, proofreading), Gemini (drafting, SEO ideas)
- **PDF text:** `unpdf` (pdf.js), with right-to-left line ordering for Hebrew
- **Hosting:** [xhostd](https://xhostd.com) — app and Postgres (moved from Render in September 2026)

## What's on the site

### Office site and content

| Route | What it is |
|---|---|
| `/` | Home page |
| `/about`, `/contact` | About; contact form (saved as `Submission`) |
| `/services`, `/services/[slug]` | Practice areas |
| `/articles`, `/articles/[slug]` | Legal articles — practical guides with law quotes, info cards and attached rulings |
| `/haplilist`, `/haplilist/[slug]` | "הפליליסט הדיגיטלי" — personal blog. A post can carry a *case file*: its press coverage, letters and rulings, pulled by `caseTag` |
| `/media` | Press coverage and academic publications |
| `/dictionary` | "מילון" — lexicon of coined legal terms |
| `/projects`, `/o`, `/digital-services`, `/data-pipeline` | Projects index, the "לעם" civic-sites hub, tech consulting, and a map of the data pipeline |
| `/privacy`, `/terms`, `/accessibility` | Legal pages |

### Legal-data dashboards

| Route | Source |
|---|---|
| `/defamation-rulings` | Defamation rulings — TAG-IT scope 4, served from the local mirror |
| `/foi-judgments`, `/foi-costs` | Freedom-of-information rulings and costs awards — TAG-IT scope 6 |
| `/drug-sentencing` | Drug-offence sentencing — TAG-IT scope 1 |
| `/rulings`, `/rulings/[id]` | Rulings hub (noindex) and the shared document page |
| `/comptroller-reports` | State Comptroller reports — TAG-IT scope 13, full-text search |
| `/mmm` | Knesset Research and Information Center (ממ"מ) documents — scope 14 |
| `/guidelines` | Attorney-General guidelines — mirrored corpus with semantic search |
| `/class-actions` | Class-actions register (TAG-IT `class-action` collection, cached, not mirrored) |
| `/conditional-arrangements` | Conditional arrangements (police, prosecution, labor ministry) from CKAN / R2 |
| `/sanegoria` | Public-defender criminal-proceedings dashboard |
| `/pach-hamishpat` | "פח המשפט" — Net HaMishpat status reports and comments |

`/foi-guide` is an admin-only preview of the FOI guide that the FOI MCP server serves.

### Tools and extension pages

Browser extensions and add-ons, each with privacy/terms pages: `/case-tracker`, `/court-downloader`, `/govscraper`, `/letz`, `/ocal`, `/ocoi-extension`, `/over-looker` (Looker Studio connector), `/legal-tools` (Google Docs add-on). Product demos: `/workflows`, `/timeline`, `/whatsapp` — their `/[slug]` pages are private workspaces (noindex, disallowed in robots).

## MCP servers

Two [Model Context Protocol](https://modelcontextprotocol.io) servers (Streamable HTTP, JSON responses, no SSE). Add them in Claude ("Settings → Connectors → Add custom connector"), ChatGPT, Cursor or MCP Inspector by URL.

### Legal articles — `https://www.z-g.co.il/api/mcp/articles`

Public, no sign-in (the articles are public), rate-limited per IP; calls are logged to `mcp_usage` under `public`. Only published articles are visible.

| Tool | What it does |
|---|---|
| `articles_list` | Every published article: title, slug, excerpt, category, tags, date, number of attached documents |
| `articles_search` | Free-text search over titles, excerpts, tags, bodies and the names of attached documents; `"exact phrase"` supported |
| `article_get` | The full article as Markdown, plus its **attached documents** — each with an id, title, parsed case citation (e.g. `ע"א 8849/01`), the section it is cited in, and its URL |
| `article_documents` | Every attached document across all articles (or one article), and which articles cite it |
| `document_get_text` | Full text of an attached PDF, page by page, with paging for long documents; scanned PDFs are flagged |

A document is any link in the article body to a file hosted on the site (`/uploads/…`) or to a PDF. Files hidden in `/admin/files` are listed as unavailable and never read. `document_get_text` only reads documents that a published article links to. Code: `src/app/api/mcp/articles/route.ts`, `src/lib/articles-mcp.ts`, `src/lib/pdf-text.ts`.

### FOI guide — `https://www.z-g.co.il/api/mcp/foi-guide`

Invite-only closed beta. OAuth 2.1 + PKCE with dynamic client registration (RFC 7591), metadata at `/.well-known/oauth-protected-resource` (RFC 9728) and `/.well-known/oauth-authorization-server` (RFC 8414); users sign in with Google and must hold an `McpInvite`. Tools: `foi_guide_search` (semantic search over the FOI guide), `foi_list_sections`, `foi_examples_by_section` (decided cases per statute clause). Invites and usage are managed in the admin panel. Code: `src/app/api/mcp/foi-guide/`, `src/lib/mcp-oauth.ts`.

## Admin panel

`/admin`, Google sign-in, ADMIN role only. Main screens:

- **Site content:** site editor (every page's blocks), articles, הפליליסט posts, dictionary, practice areas, media appearances, case documents, file upload, **file manager** (`/admin/files`).
- **Data and AI tools:** FOI guide ingestion, guidelines / class-actions / conditional-arrangements settings, פח המשפט moderation.
- **Communication and projects:** WhatsApp workspaces, timeline projects, contact submissions.
- **Tools and settings:** automatic Hebrew proofreading (OpenAI), SEO (Search Console + Gemini ideas), billing across providers, site settings.

An admin bar on the public site adds edit buttons for signed-in admins.

## Files and uploads

- Uploads (`/api/media/upload`) are stored **in Postgres** (`uploaded_files`) and served by `src/app/uploads/[filename]/route.ts`. Git-committed files in `public/seed-uploads/` are copied into `public/uploads/` at build and start.
- **`/admin/files`** lists every file served under `/uploads`, where each one appears on the site (articles, posts, case documents, media appearances, pages and drafts, services, settings, פח המשפט), with search and filters (usage, visibility, format, size, storage).
- Any file can be marked **non-public** (`file_settings`). `src/proxy.ts` then answers 404 to non-admins on `/uploads`, `/seed-uploads` and the `/_next/image` optimizer; the change takes effect within about 5 seconds.

## Data sources and sync jobs

| Source | Stored in | Synced by |
|---|---|---|
| TAG-IT scopes 1, 4, 6 (rulings) | `tagit_docs` | `scripts/rulings-mirror-sync.ts` — incremental every 15 min, full nightly |
| TAG-IT `over-guidelines` (~12,000 AG guidelines) | `guideline_docs` + OpenAI embeddings | `scripts/guidelines-mirror-sync.ts` — daily |
| CKAN / odata.org.il + Cloudflare R2 CSVs (conditional arrangements) | `CaRecord` | `scripts/ca-sync-local.ts` — weekly (never in the web process: the police CSV is ~255 MB) |
| TAG-IT scopes 13, 14, `class-action` | not mirrored | read live with an in-process cache |
| pah.org.il | `Pach*` tables | `scripts/sync-pach-hamishpat.ts` (manual) |
| he.wikisource.org | — | law-text import in the editor (`/api/import/law`) |

On production these jobs run in the container: `launch.sh` starts `scripts/xhostd-sync-scheduler.ts` when `SYNC_SCHEDULER=true`. Each job runs in its own child process with its own heap limit and timeout, one at a time. The old GitHub Actions for these jobs are disabled; the active workflow is `monitor.yml`, which runs `npm run test:monitor` against production every 3 hours.

## Deployment (xhostd)

- **Build:** `install.sh` — `npm ci`, restore seed uploads, `next build` (no database at build time).
- **Run:** `launch.sh` — unless `RUN_MIGRATIONS=false`, runs `prisma db push` and `prisma/ensure-dashboard-content.ts`; starts the sync scheduler when `SYNC_SCHEDULER=true`; then `next start` on `$XHOST_HTTP_PORT`.
- **Releasing:** xhostd does **not** deploy on push. Push `master` to GitHub *and* to `git@git.xhostd.com:zomerg/z-g-website.git`, then trigger a deploy of the `prod` channel (xhostd console or MCP `deploy`).
- The database is xhostd Postgres (`db.xhostd.com`). `render.yaml` and the `build`/`start` npm scripts are left over from Render and are not used in production.
- `src/proxy.ts` redirects the bare `z-g.co.il` to `www`, protects `/admin`, blocks hidden uploads, and marks non-canonical hosts `noindex`.

## Local development

Requires Node.js 22+ and a PostgreSQL database.

```bash
git clone https://github.com/zomer-g/z-g-website.git
cd z-g-website
npm install
cp .env.example .env      # then fill in the values
npm run db:push           # create the schema in YOUR database
npm run db:seed
npm run db:seed-content
npm run dev               # http://localhost:3000
```

> ⚠️ Point `DATABASE_URL` at a local or disposable database. `npm run build` and `npm run db:push` change the schema of whatever database `DATABASE_URL` names, and scripts in `scripts/` that import `dotenv/config` write to it.

## Environment variables

Names only — see `.env.example` for the template. Never commit values.

- **Core:** `DATABASE_URL`, `SITE_URL`, `NEXT_PUBLIC_SITE_URL`
- **Auth:** `NEXTAUTH_SECRET` (or `AUTH_SECRET`), `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID_PUBLIC`, `GOOGLE_CLIENT_SECRET_PUBLIC` (MCP OAuth), `ADMIN_EMAILS`
- **Hosting / runtime:** `RUN_MIGRATIONS`, `SYNC_SCHEDULER`, `SYNC_JOBS`, `WEB_HEAP_MB`, `XHOST_HTTP_PORT`
- **Data:** `TAGIT_API_URL`, `RULINGS_API_KEY`, `GUIDELINES_API_KEY`, `CLASS_ACTION_API_KEY`, `TAGIT_MIRROR_SCOPES`, `TAGIT_MIRROR_PAGE_SIZE`, `MIRROR_SYNC_SECRET`, `CRON_SECRET`
- **AI:** `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GUIDELINES_EMBED_BUDGET_PER_MIN`
- **SEO:** `GSC_SITE_URL`, `GSC_SERVICE_ACCOUNT_JSON`
- **Billing dashboard:** `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_BILLING_TOKEN`, `OPENAI_ADMIN_KEY`, `DEEPSEEK_API_KEY`, `NEON_API_KEY`, `NEON_ORG_ID`, `RENDER_API_KEY`, `GCP_BILLING_BQ_PROJECT`, `GCP_BILLING_BQ_DATASET`, `GCP_BILLING_BQ_TABLE`, `GCP_SA_KEY_JSON`
- **Tests:** `MONITOR_BASE_URL` and the other `MONITOR_*` / `BENCH_*` variables

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Restore seed uploads, start the dev server |
| `npm run build` | `prisma db push` + ensure dashboard content + `next build` (Render-era; production uses `install.sh`) |
| `npm run start` | Restore seed uploads, `next start` |
| `npm run lint` | ESLint |
| `npm run db:push` / `db:migrate` / `db:generate` / `db:studio` | Prisma schema push, migration, client generation, Studio |
| `npm run db:seed` / `db:seed-content` | Seed pages, services and structured page content |
| `npm run db:ensure-dashboards` | Re-create missing dashboard page configs |
| `npm run proofread` | Hebrew proofreading pass over site content |
| `npm run test:monitor` / `test:unit` / `test:migration*` | Test suites (below) |

`scripts/` also holds the sync runners, the xhostd scheduler and one-off content seeds (articles, blog posts, case files).

## Tests

- **`tests/monitoring/`** — `npm run test:monitor` with `MONITOR_BASE_URL`: every data page's API returns 200 with records; TAG-IT connectivity per scope.
- **`tests/unit/`** — `npm run test:unit`: class-actions cache, guidelines mirror.
- **`tests/migration/`** — `npm run test:migration -- --base <url> --label <name>`: ~120 page checks plus a performance pass; `test:migration:db` fingerprints a database, `test:migration:compare` diffs two runs.
- **`tests/security/`** — `node --import tsx --experimental-test-module-mocks --test tests/security/security.test.ts`, plus `CHECKLIST.md`.
- **`tests/benchmarks/`** — rulings and drug-search benchmarks (see its README).

## Project structure

```
src/
  app/                 # pages, route handlers (App Router)
    admin/             # admin panel
    api/               # REST endpoints; api/mcp/ = the MCP servers
    .well-known/       # OAuth metadata for the FOI MCP server
    uploads/[filename] # serves uploaded files from Postgres / disk
  components/          # admin, layout, ui, per-feature components
  lib/                 # data access, mirrors, MCP, PDF text, auth, OG images
  proxy.ts             # middleware: redirects, admin gate, hidden files
prisma/
  schema.prisma        # 53 models: CMS, mirrors, dashboards, WhatsApp, timeline, MCP
scripts/               # sync runners, xhostd scheduler, seeds, one-off fixes
tests/                 # monitoring, unit, migration, security, benchmarks
install.sh, launch.sh  # xhostd build and run
```

## License

All rights reserved.
