# Loadoutize

A web app for building, discovering, and sharing game loadouts. Publish a focused weapon configuration or a complete class setup, explore community builds and game meta, and share setups through permanent links or downloadable QR codes.

**Status:** Beta. The interface and features are still evolving. The current configuration focuses on Modern Warfare 4; additional games are modeled in the app but gated by `GAME_SELECTOR_ENABLED` in [`src/lib/games.ts`](src/lib/games.ts).

## Features

- Browse community builds with weapon, category, playstyle, content-type, and rating/date controls.
- Search across build text, weapons, attachments, linked videos, creator names, and creator social URLs.
- Publish either a single weapon configuration or a full loadout containing primary and secondary builds, melee, one perk from each perk group, throwable, tactical, and field upgrade selections.
- Attach YouTube, TikTok, or Instagram video links to published builds.
- Share loadouts using permanent links and QR codes.
- Like, dislike, and favorite builds. Qualified community ratings use `D-` through `S+` tiers; a build needs five votes to receive a rating and at least 25 votes to qualify for `S+`.
- Explore the meta dashboard plus searchable rankings for weapons, weapon groups, attachments, attachment groups, and perks.
- View creator profiles, social links, and community activity.
- Sign in with email/password or Google and manage your profile and loadouts.
- Responsive dark interface with game-specific colors, card effects, and lazily loaded Three.js navigation icons.

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

The frontend currently connects to the hosted Supabase project configured in [`utils/supabase/info.tsx`](utils/supabase/info.tsx). Running Vite does **not** start a local backend: catalog data, authentication, and saved builds depend on that service. Changes made while signed in use the configured backend.

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

The dashboard is exposed at `http://localhost:8055`. See [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) for the existing Directus setup notes; parts of that manual runbook predate the current migration history.

The authoritative incremental database history is [`supabase/migrations/`](supabase/migrations/). It includes the relational weapon, attachment, perk, equipment, reaction, profile, content-type, perk-group, and equipment-`Any` changes used by the current Edge Function. Create future database changes through the same imperative migration workflow.

[`SCHEMA.sql`](SCHEMA.sql) remains a destructive drop/recreate reference and must not be run against an existing environment. [`CATALOG_SEED.sql`](CATALOG_SEED.sql) is a separate catalog data source. Although [`supabase/config.toml`](supabase/config.toml) enables a conventional `supabase/seed.sql`, that seed file is not currently committed, so do not assume `supabase db reset` provides a complete catalog bootstrap.

## Content and rating model

Published content uses two explicit types:

| Type | URL | Contents |
| --- | --- | --- |
| Full loadout | `/:gameId/l/:loadoutId` | Primary and secondary weapons with attachments, melee, grouped perks, equipment, and an optional in-game code |
| Weapon configuration | `/:gameId/weapon/:configId` | One weapon and its attachment setup |

Reactions are stored relationally. Ratings are calculated from likes and dislikes after `MIN_RATING_VOTES` in [`src/lib/metaMetrics.ts`](src/lib/metaMetrics.ts), while favorites contribute to discovery score without changing the displayed approval percentage. Unqualified builds display as `New`. Tier thresholds include `+` and `-` grades, and `S+` additionally requires `MIN_S_PLUS_VOTES`.

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
supabase/migrations/        Ordered Postgres migration history
supabase/config.toml        Local Supabase and Edge Function configuration
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
| `/:gameId/meta` | Meta dashboard |
| `/:gameId/meta/weapons` | Complete weapon ranking |
| `/:gameId/meta/weapongroup/:weaponGroup` | Ranking for one weapon group |
| `/:gameId/meta/weapons/:weaponId` | Weapon breakdown |
| `/:gameId/meta/attachments` | Complete attachment ranking |
| `/:gameId/meta/attachmentgroup/:attachmentGroup` | Ranking for one attachment group |
| `/:gameId/meta/attachments/:attachmentId` | Attachment breakdown |
| `/:gameId/meta/perks` | Perk ranking |
| `/:gameId/community` | Creator community |
| `/:gameId/create` | Full-loadout and weapon-configuration builder |
| `/:gameId/l/:loadoutId` | Shared full loadout |
| `/:gameId/weapon/:configId` | Shared weapon configuration |
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
