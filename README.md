# Loadoutize

A web app for building, discovering, and sharing game loadouts. Create weapon builds with attachments, perks, and equipment; explore community setups; and share your favorites through links or downloadable QR codes.

**Status:** Beta. The interface and features are still evolving. The current configuration focuses on Modern Warfare 4; additional games are modeled in the app but gated by `GAME_SELECTOR_ENABLED` in [`src/lib/games.ts`](src/lib/games.ts).

## Features

- Browse and search community loadouts, with category filters and sorting.
- Build and publish loadouts with weapon attachments, playstyle tags, and video links.
- Share loadouts using permanent links and QR codes.
- Like, dislike, and favorite builds, and explore weapon meta rankings.
- View creator profiles, social links, and community activity.
- Sign in with email/password or Google and manage your profile and loadouts.
- Responsive dark interface with game-specific colors and animated 3D elements.

## Stack

| Area | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite 6, React Router 7 |
| UI | Tailwind CSS 4, Radix UI, shadcn/ui-style components |
| Animation and 3D | Motion, Three.js, React Three Fiber, Drei |
| Backend | Supabase Auth, Postgres, Storage, and a Deno Edge Function using Hono |
| Catalog editing | Directus, run separately with Docker Compose |
| Hosting | Vercel configuration included |

## Run locally

Use Node.js 22 LTS and npm. From the repository root:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

The frontend currently connects to the hosted Supabase project configured in [`utils/supabase/info.tsx`](utils/supabase/info.tsx). Running Vite does **not** start a local backend: catalog data, authentication, and saved loadouts depend on that service. Changes made while signed in use the configured backend.

The root `.env.example` configures the optional Directus service; it is not required to start the frontend. Frontend Supabase configuration is currently stored in the generated configuration module rather than Vite environment variables.

### Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed npm lockfile |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the production frontend in `dist/` |
| `npx vite preview` | Preview a production build locally |

No automated test suite or lint command is currently configured. The Vite build validates bundling but does not perform a full TypeScript type check.

## Backend and catalog

The backend source is [`supabase/functions/server/index.tsx`](supabase/functions/server/index.tsx). Its API routes use the `/make-server-6db475c7/` prefix. The frontend talks directly to Supabase Auth and calls the Edge Function for application data.

The function reads these server-side settings:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server-side database access |
| `SUPABASE_STORAGE_BUCKET` | Catalog asset bucket; defaults to `cms-assets` |
| `RECAPTCHA_SECRET_KEY` | Enables server-side reCAPTCHA verification when set |

For a separate deployment, the frontend project configuration, deployed API path, Auth redirect URLs, and reCAPTCHA site configuration must match your services. Keep service-role keys and other secrets out of frontend code and Git.

Directus is only needed to edit catalog content; the app reads through Supabase without requiring Directus to stay running. To start the CMS after preparing its database and storage configuration:

```bash
cp .env.example .env
# Fill in .env with your Directus and database/storage settings.
docker compose up -d
```

The dashboard is exposed at `http://localhost:8055`. See [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) for the existing CMS setup notes.

**Database setup limitation:** [`SCHEMA.sql`](SCHEMA.sql) is a reference schema containing destructive drop/recreate statements, and its relational loadout model differs from the current Edge Function's JSONB write path. It is not a safe migration for an existing database or a complete, verified bootstrap of the live app. [`CATALOG_SEED.sql`](CATALOG_SEED.sql) contains catalog seed data. Review both against the backend before using them for a new environment.

## Project structure

```text
src/
  app/App.tsx               Routing and global application setup
  components/
    atoms/                  Primitive controls, typography, icons, and effects
    molecules/              Small composed controls and interaction patterns
    organisms/              Navigation, cards, and reusable page sections
    templates/              Page layout shells
    pages/                  Route-level screens
  hooks/                    Shared React hooks
  providers/                Application context and providers
  lib/                      Utilities, metadata, and shared content
  types/                    Shared domain types
  assets/                   Images, icons, and fonts
  styles/                   Styles and design tokens
  main.tsx                  React entry point
supabase/functions/server/  Backend Edge Function
utils/supabase/             Generated frontend Supabase configuration
public/                     Static icons and site metadata
```

Components follow atomic design with PascalCase filenames. Hooks use `useCamelCase`; utilities and domain types use descriptive camelCase names. See [Architecture](docs/ARCHITECTURE.md) for layer responsibilities and dependency rules.

The `@` import alias points to `src/`. The Vite configuration also resolves `figma:asset/` imports to `src/assets/`.

## Main routes

| Route | Page |
| --- | --- |
| `/home` | Homepage (`/` redirects here) |
| `/explore` | Loadout discovery |
| `/u/:nickname` | Public creator profile |
| `/join`, `/auth/callback` | Sign-in and OAuth callback |
| `/liked`, `/settings` | Saved favorites and account settings |
| `/:gameId/meta`, `/:gameId/community` | Rankings and community |
| `/:gameId/create` | Loadout builder |
| `/:gameId/l/:loadoutId` | Shared loadout |
| `/:gameId/weapon/:configId` | Saved weapon build |
| `/privacy`, `/terms` | Legal pages |

Legacy `/:gameId/explore` and `/:gameId/loadout/:loadoutId` links redirect to the current routes.

## Deployment

[`vercel.json`](vercel.json) configures Vite, runs `npm run build`, publishes `dist/`, and rewrites routes to `index.html` for client-side navigation. Other static hosts need the same SPA fallback.

Frontend deployment does not deploy the Supabase function, provision the database, or start Directus. Configure those services separately. Build output, local environment files, and operating-system metadata are ignored by Git.

## Design and project notes

- [`PROJECT.md`](PROJECT.md) — architecture and design-system notes; some route descriptions reflect earlier iterations.
- [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md) — third-party component and image acknowledgments.
- The repository retains original Figma and imported design references for future design work.

No project-wide license has been added. Third-party materials retain their respective licenses; see the attribution file.
