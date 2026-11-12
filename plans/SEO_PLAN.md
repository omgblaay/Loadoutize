# Plan: SEO for Loadoutize (MW4)

## Current state (verified in code)

- **Vite + React Router 7 SPA** (`BrowserRouter`), deployed on Vercel. `vercel.json` rewrites every path to `index.html`.
- **Soft 404s:** unknown paths return HTTP 200 with the app shell. The `NotFound` page is client-side only, so Google sees "found" pages.
- **Canonical and OG URL are hardcoded** in `index.html` to `https://loadoutize.com/`. No page sets its own canonical, so every route canonicalises to the homepage. This is the biggest current problem.
- **Title and description are not per page.** `usePageTitle` sets `document.title` on some pages only. Meta description and JSON-LD are static.
- **Empty HTML shell.** `<div id="root">` is filled by JS, so the first request has no content for crawlers.
- **`public/sitemap.xml` is stale.** It lists `/mw4/explore` and `/mw4/meta`, which redirect to `/explore` and `/meta`. JSON-LD `VideoGame.url` has the same stale path.
- **`public/robots.txt`** is fine (`Allow: /`, sitemap link).
- **Routes that matter for search:**
  - `/home`, and `/` redirects to `/home`
  - `/explore`, the public loadout feed
  - `/meta`, the weapon tier list (aggregates real likes, dislikes, favourites)
  - `/meta/weapons`, `/meta/weapons/:weaponId`
  - `/meta/attachments`, `/meta/attachments/:attachmentId`, `/meta/attachmentgroup/:group`
  - `/meta/perks`
  - `/cfg/:configId` (single weapon build), `/l/:loadoutId` (full loadout)
  - `/u/:nickname` (creator profile)
- **URL problem:** weapon IDs are internal codes such as `rex_ammo_4x30_ap`. They are not clean slugs.
- **Data source:** weapon names and images come from Supabase `weapons` (filled via Directus). They are not from the SQLite catalog in `Webflow-Naidfe`. That catalog is a separate, unverified research project.
- **Real user signal exists:** `loadout_reactions` (like, dislike, favourite) and `ratingPercent`, which is `null` below 3 votes. This is the honest basis for ratings.
- **No separate marketing site.** Only this app is in scope. Its legacy URL shapes already redirect in `App.tsx`: `/:gameId/explore`, `/:gameId/meta/weapongroup/:group`, `/:gameId/cfg|weapon/:configId`, and `/:gameId/loadout/:id`.

## Decision needed: framework

The original brief says "use Next.js". Options:

**A. Migrate to Next.js App Router (as briefed)**
- Gets true SSR/SSG/ISR and real HTTP 404s.
- Costs a rewrite of routing (`react-router` → App Router), the `figma:asset/` resolver, the dev bridge in `vite.config.ts`, and about 30 screens. The Hono edge function and Supabase stay.
- Estimated effort: large, several days of focused work plus QA.

**B. Keep Vite, prerender the SEO routes**
- Build-time generation of static HTML for meta/weapon/loadout routes from Supabase, with per-route `<title>`, description, canonical, and JSON-LD.
- Real 404 status via a generated `404.html` and Vercel config for unknown paths.
- Much less change; app screens stay as they are.
- Limit: dynamic data still needs a rebuild or ISR-like revalidation (Vercel cron or on-demand).

**Recommendation:** B first, since it fixes the canonical, soft-404, and empty-HTML problems in days. Move to A only if B's revalidation becomes a bottleneck. Confirm before starting.

## Phase 1: Crawlable and correct (framework-independent fixes)

1. Replace the hardcoded canonical and OG URL with per-route values. Add `<meta name="description">` per route.
2. Real 404s for unknown paths. The `/:gameId/*` and legacy redirects must stay 301s.
3. Generate `sitemap.xml` from Supabase (published weapons, attachments, loadouts with `updated_at`). Remove `/mw4/*` entries.
4. Fix JSON-LD `VideoGame.url` to the canonical path.
5. Verify with `curl -I` (status and canonical per route), view-source (full HTML and unique title), and the Rich Results Test.
6. Submit the sitemap in Google Search Console and check the Pages report after 1–2 weeks.

## Phase 2: URLs and redirects

1. Add a `slug` column to `weapons` (and attachments). Generate once, then keep stable.
2. Clean URLs (current app structure, not `/mw4/weapons/...`):
   - `/meta/weapons/:slug` for weapon pages
   - `/meta/weapons/:slug/best-loadout` for the best loadout page
   - `/meta/attachments/:slug`
3. Keep old `:weaponId` URLs working with 301s to the slug URL.
4. Redirect map for this app's legacy URLs:
   - Inventory every URL that has been public: the current sitemap, GSC Pages report (16 months), and any shared links (Discord, QR codes, the Chrome extension).
   - Map each to the closest new page. Anything without an equivalent goes to the nearest hub, not the homepage.
   - Keep the existing legacy redirects in `App.tsx` as 301s, and check each one with `curl -I`.

## Phase 3: Search intent and content

1. Keyword research (free):
   - GSC queries for current pages, including impressions with no clicks
   - Google Keyword Planner for "[weapon] best loadout mw4", "[weapon] attachments", "best meta loadouts"
   - Google autocomplete suggestions
   - Output: a CSV of query, intent, target URL. One primary query per URL.
2. One intent per page:
   - Weapon page: stats, attachments, usage share from real loadouts
   - Best-loadout page: top loadout for the weapon, with build rationale
   - Hub (`/meta`, `/meta/weapons`): ranked list plus links out
3. Publish gate: a weapon page is indexed only when it has at least one of:
   - a rating over the minimum vote count (3)
   - build rationale written by a person
   - usage share from real loadouts

   Otherwise it is `noindex` (still served, so links work).
4. Ratings: show `AggregateRating` only when the percentage is visible on the page and comes from real `loadout_reactions`. Skip it otherwise.

## Phase 4: Structure and internal linking

1. Hierarchy: home → `/meta` → `/meta/weapons` → weapon → best loadout. Keep every important page within 3 clicks.
2. Weapon page links to its category, its best loadouts, and 3–5 related weapons in the same category.
3. Best-loadout page links back to its weapon, `/meta`, and the same category.
4. Anchor text names the target ("best MW4 assault rifle loadout"), not "click here".
5. Structured data:
   - `BreadcrumbList` on all content pages
   - `Article` for written build guides (`dateModified`, author)
   - `VideoObject` only for embedded YouTube videos
   - No `Review` or `AggregateRating` without the visible user-rating rule above

## Phase 5: Performance and mobile

1. Images: `next/image` (or equivalent WebP/AVIF) with explicit width and height. Priority only on the LCP image.
2. Lazy-load the QR canvas (`qrcode`) and three.js (`@react-three/fiber`, used for the flame effect on standout cards). Neither should load on SEO pages.
3. Check bundle size. `recharts`, `three`, and MUI are large. Confirm they are not in the initial chunk for content pages.
4. Fonts: subset Aspekta and Science Gothic, `font-display: swap`.
5. Targets on mobile: LCP < 2.5s, INP < 200ms, CLS < 0.1 (PageSpeed Insights and GSC Core Web Vitals).
6. Test on a real phone at 375px width. Attachment tables collapse to stacked cards.

## Phase 6: Accessibility and headings

1. One `<h1>` per page. Headings in order, no skips.
2. Alt text names the weapon or attachment. Decorative icons get `alt=""`.

## Open items

- Choose framework option (A or B).
- Provide a GSC Pages export (or a list of old URLs with traffic) so the redirect map can be built from real data.
- Confirm the Supabase schema for `weapons` includes the fields needed for slugs (no migration applied yet).
- Legal: the weapon icons come from game files. Check Activision's terms before indexing pages that show them.
- Stale copy: the homepage countdown targets 23 Oct 2026, which has passed (today is 11 Nov 2026). Confirm whether MW4 has launched before writing launch-related copy.

## Status

- **Step 1, Next.js shell (branch `nextjs-migration`): done.**
  - Vite replaced with Next.js 14 (last line supporting React 18). The app still runs client-side inside a catch-all route (`src/app/[[...slug]]`, `ssr: false`), so behavior is unchanged.
  - Build passes, type check is clean, 81 unit tests pass, and smoke tests on 7 routes show no page or console errors.
  - Known gaps carried into Phase 1: canonical is still `/` on every route, unknown paths still return 200, and `sitemap.xml` still lists `/mw4/*`.
- **Step 2, server-rendered SEO routes:** not started.
- **Steps 2–3, search-intent pages and linking (branch `nextjs-migration`): built, not yet indexable.**
  - Server-rendered pages: `/meta/weapons/[weapon]`, `/meta/weapons/[weapon]/best-loadout`, `/meta/categories/[category]`, `/best-loadouts`. ISR at 1 hour.
  - Weapon URLs use slugs from display names. Old `/meta/weapons/<id>` URLs 308 to the slug.
  - Real 404s for unknown weapons and for weapons with no build. `noindex` below the publish gate.
  - Breadcrumbs and `BreadcrumbList` on every page. `VideoObject` only for YouTube builds. No `Review` or `AggregateRating` anywhere.
  - Home links to the hub with a real `<a>`.
  - Backend: additive `authorIsOrganic` and `organic*` fields in `supabase/functions/server/index.tsx`. **Not deployed.** Pages fail closed until it is.
  - Keyword map: `Plans/SEO_KEYWORDS.md`. Search volume still needs Keyword Planner and Search Console exports.
  - Data reality: 0 of 30 weapons pass the gate today. Only 3 of 109 public builds are from non-seeded authors, and none has organic votes.
