# Z-G | Guy Zomer - Attorney Website

Personal website for Guy Zomer, criminal defense attorney. Built with Next.js, PostgreSQL, Prisma, and TipTap.

**Live:** [z-g.co.il](https://z-g.co.il)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth v5 (Google OAuth)
- **Editor:** TipTap (ProseMirror)
- **Styling:** Tailwind CSS 4
- **Deployment:** Render

## Local Development

### Prerequisites

- Node.js 22+
- PostgreSQL database (local or remote)

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/zomer-g/z-g-website.git
   cd z-g-website
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` from the example:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your values:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/zg_website"
   NEXTAUTH_SECRET="generate-a-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ADMIN_EMAILS="your-email@example.com"
   ```

5. Push the database schema:
   ```bash
   npm run db:push
   ```

6. Seed initial data:
   ```bash
   npm run db:seed
   npm run db:seed-content
   ```

7. Start the dev server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

### Admin Panel

Navigate to `/admin` and sign in with Google (your email must be in `ADMIN_EMAILS`).

## Project Structure

```
src/
  app/              # Next.js pages and API routes
    admin/          # Admin panel (dashboard, editors)
    api/            # REST API endpoints
    articles/       # Blog/articles pages
    services/       # Practice areas
    projects/       # Civic tech projects
    digital-services/
    legal-tools/    # Google Docs add-on pages
  components/
    admin/          # Admin UI (editor, section editors, admin bar)
    layout/         # Header, footer, public layout
    ui/             # Reusable UI components
    home/           # Homepage components
  lib/              # Utilities (auth, prisma, content, rate-limit)
  types/            # TypeScript type definitions
prisma/
  schema.prisma     # Database schema
scripts/            # One-time migration and seed scripts
```

## Key Features

- **Content Management:** Full admin panel with structured page editors and TipTap rich text
- **Admin Bar:** WordPress-style edit buttons on the live site (visible to admins only)
- **Practice Areas:** Dynamic service pages with info blocks and law section blocks
- **Law Import:** Import law sections directly from Wikisource (he.wikisource.org)
- **Media Appearances:** Manage press coverage with thumbnails
- **Projects Showcase:** Civic tech initiatives display
- **Accessibility:** WCAG 2.1 compliant (skip link, ARIA, focus management, RTL)
- **SEO:** JSON-LD structured data, sitemap, meta tags

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed basic pages and services |
| `npm run db:seed-content` | Seed structured page content |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |

## License

All rights reserved.
