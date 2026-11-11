# Loadoutize: quick agent handoff

## Task

Paste the specific task here before handing this file to another agent. Include the desired behavior, affected page or feature, and any screenshot or acceptance criteria. This document supplies project context; it does not define a task by itself.

## Project in one minute

Loadoutize is a responsive web app for creating, browsing, and sharing game weapon configurations and full loadouts. Modern Warfare 4 is the currently enabled game. Users can browse public builds, open permanent `/cfg/:configId` and `/l/:loadoutId` links, and create builds after signing in. A separate Chrome extension shows public builds associated with the YouTube video being watched.

The frontend uses React 18, TypeScript, Vite, React Router 7, Tailwind CSS 4, and Radix based components. The backend uses Supabase Auth, Postgres, Storage, and a Deno/Hono Edge Function. The local frontend connects to the configured hosted Supabase project; running Vite does not start a local backend. Avoid changing live data while testing.

## Find the right code

| Area | Location |
| --- | --- |
| Routes and app setup | `src/app/App.tsx` |
| Page screens, including home and builder | `src/components/pages/` |
| Reusable UI | `src/components/atoms/`, `molecules/`, `organisms/`, `templates/` |
| Shared logic, routes, and weapon preview helpers | `src/lib/` |
| Theme and styles | `src/styles/` |
| Supabase API | `supabase/functions/server/` |
| Database migration history | `supabase/migrations/` |
| YouTube extension source | `extension/Loadoutize Helper/` |
| Extension privacy disclosure | `src/components/pages/PrivacyPolicy.tsx` |

Use `@/` for imports from `src/`. Put shared types in `src/types/` and shared helpers in `src/lib/`. Match nearby component patterns and the existing dark visual style. Read `docs/ARCHITECTURE.md` for component layer rules. `README.md` is the best broad overview; some older details in `PROJECT.md` are stale, so verify behavior in current code.

## Run and verify

```bash
npm ci
npm run dev
npm run build
npm test
```

Node.js 22 LTS is the documented local version. `npm run build` checks the production bundle; run relevant tests for logic changes. Inspect `git status` before editing and preserve existing changes. Do not commit generated `dist/`, local `.env` files, or secrets. Database or Edge Function changes need their own verification; a frontend build alone does not deploy or test them.

## Useful context for extension tasks

`manifest.json` injects the content script only on YouTube and grants the background worker access to the Loadoutize Supabase API host. The content script reads the current watch page's 11-character video ID, requests matching public builds, and inserts a panel below the video title. `content.js`, `content.css`, and `background.js` contain the behavior. `preview.html` previews the empty state. For Chrome Web Store uploads, package the extension files with `manifest.json` at the ZIP root; the repository also has a prepared Web Store ZIP.
