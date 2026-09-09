# Loadoutize

A React single-page app for building, browsing, and sharing game weapon loadouts. Currently scoped to **Call of Duty: Modern Warfare 4** (unreleased — the homepage runs a countdown to its 23 October 2026 launch), with **Warzone**, **Battlefield 6**, **The Finals**, and **Delta Force** modeled in the data layer and ready to switch on later via a single feature flag.

Originally generated from a Figma Make design ([source file](https://www.figma.com/design/mr64C2Z2J4CvNSElAQw9p0/LOADOUTIZE-2027)) and since extended well past the scaffold.

---

## 1. What it does

- **Explore** a public feed of community-submitted loadouts per game, filterable by weapon category, searchable, sortable.
- **Build** a loadout: pick a weapon, equip attachments per slot (optic, muzzle, barrel, underbarrel, magazine, rear grip, stock, laser, sight), pick perks/equipment, attach a YouTube video, tag a playstyle, and publish it under an in-game code.
- **Share** a loadout via a permalink or a generated QR code (plain or branded PNG, downloadable).
- **React**: like/dislike/favorite other players' loadouts; view counts and a computed rating percentage feed a sortable "Meta" leaderboard per weapon.
- **Follow the community**: a per-game Community view (member list, activity) and a public creator profile page (`/u/:nickname`) with social links (Twitch, YouTube, Twitter/X, TikTok, Discord, etc.) and stats.
- **Authenticate** via email/password or Google OAuth; a signed-in user gets a profile (nickname, avatar, role tag — player/creator/pro), a builder, and edit/delete rights on their own loadouts.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 (SPA), Vite build |
| Routing | React Router 7 (`BrowserRouter`) |
| Styling | Tailwind CSS v4 (`@theme inline` tokens), CSS custom properties for theming |
| Component primitives | Radix UI, wrapped as shadcn/ui-style components in `src/components/atoms/` and `src/components/molecules/` |
| 3D / motion | `@react-three/fiber` + `@react-three/drei` + `three` (a WebGL flame shader effect for standout cards), `motion` for micro-interactions |
| Forms | `react-hook-form` |
| Drag & drop | `react-dnd` |
| Charts | `recharts` |
| QR codes | `qrcode` |
| Backend | Supabase (Postgres, Auth, Storage, Edge Functions on Deno + Hono) |
| Catalog CMS | Self-hosted Directus, pointed at the same Postgres DB (editorial-only; no runtime dependency) |

No test suite is configured. Build with `npm run build`, dev with `npm run dev`.

---

## 3. Architecture

### Frontend structure

```text
src/
  main.tsx                 → mounts App
  app/App.tsx              → routing, global providers, redirects
  components/
    atoms/                 → primitive controls, icons, effects
    molecules/             → composed controls and interaction patterns
    organisms/             → navigation, cards, reusable page sections
    templates/             → AppLayout page shell
    pages/                 → route screens
  hooks/                   → usePageTitle, useIsMobile, useGameName
  providers/               → AuthProvider and useAuth
  lib/                     → game metadata, routes, shared helpers and content
  types/                   → shared game and loadout types
  styles/                  → design tokens, typography, keyframes
```

See [Architecture](docs/ARCHITECTURE.md) for naming and dependency conventions.

`@` resolves to `src/`. Figma-exported assets are imported via the `figma:asset/` virtual prefix (mapped to `src/assets/`).

### Routes

| Path | Screen | Notes |
|---|---|---|
| `/` | `GameSelector` | Landing page; game picker (locked to MW4 for now) + release countdown |
| `/u/:nickname` | `UserPage` | Public creator profile |
| `/liked` | `LikedLoadouts` | Signed-in user's favorited loadouts |
| `/settings` | `Settings` | Profile, avatar, nickname, role tag |
| `/join` | `Join` | Combined login/signup, Google OAuth |
| `/auth/callback` | `AuthCallback` | OAuth redirect handler |
| `/privacy`, `/terms` | `PrivacyPolicy`, `TermsOfService` | Legal |
| `/:gameId/explore` | `GameDashboard` | Public loadout feed |
| `/:gameId/meta` | `MetaView` | Weapon tier list / meta rankings |
| `/:gameId/community` | `CommunityView` | Per-game community/members |
| `/:gameId/create` | `LoadoutBuilder` | Requires auth |
| `/:gameId/l/:loadoutId` | `LoadoutPreview` | Single loadout page (public) |
| `/:gameId/weapon/:configId` | `WeaponConfigPreview` | Single saved weapon build |

`/:gameId/loadout/:loadoutId` (an older URL shape) permanently redirects to the shorter `/:gameId/l/:loadoutId`, so previously shared links keep working. All `:gameId` routes pass through a `GameLock` wrapper that redirects to MW4 while the multi-game switcher is disabled.

### Auth

`AuthProvider.tsx` talks to the Supabase REST API directly — there's no `supabase-js` on the frontend. The access token lives in `localStorage` (`access_token`); public routes use the anon key, authenticated ones use the user's token. Profile fields (nickname, avatar, role tag) live in the app's own `profiles` table, separate from Supabase's `auth.users`.

### Backend

A Deno Edge Function (`supabase/functions/server/`) using **Hono**, routed under `/make-server-6db475c7/`. It talks to Postgres via `supabase-js` with the service-role key. Responses are camelCase; each route maps its rows explicitly rather than doing a generic snake→camel transform.

Catalog content — games, weapon categories, weapons, attachment types/attachments, perks, equipment — is authored in Directus and read live by the edge function. Uploaded images resolve through `directus_files.filename_disk` to public Storage URLs.

**Data model note:** `SCHEMA.sql` documents a fully relational design (`loadout_weapons`, `loadout_weapon_attachments`, `loadout_perks`, `loadout_equipment` as junction tables). The live app doesn't use that shape — user-generated loadouts live in one `loadouts` table with a `weapons` JSONB column (embedded weapon + attachment objects) and `perks`/`equipment` as `TEXT[]`, matching what `LoadoutBuilder` actually sends. The relational schema reflects the catalog/history design intent, not the current write path.

---

## 4. Design system

### Visual language

Dark-first, near-black UI (`#0a0909` / `#100D10` backgrounds) with a grayscale, high-contrast base and a single accent color that shifts **per game** — every weapon photo is desaturated (`saturate-0`) and brightened, so the accent color (and the yellow attachment highlight, see below) is the only chromatic thing on screen.

```ts
// src/lib/gameColors.ts
mw4:       #FF6B35 (orange)
warzone:   #00D9FF (cyan)
bf6:       #00FF85 (green)
thefinals: #FF00FF (magenta)
df:        #FFC400 (gold)
```
`getGameColor(gameId)` returns `{ primary, light, dark, bg }`; always used instead of hardcoding a color so re-enabling the game switcher doesn't require re-theming every screen.

### Typography

| Token | Font | Used for |
|---|---|---|
| `--font-sans` | Aspekta | Body text |
| `--font-heading` | BBH Bartle (falls back to Aspekta) | h1–h4 |
| `--font-mono` | JetBrains Mono | Weapon names, stats, technical labels |
| `--font-handwritten` | Kabur | Loadout tag/playstyle callouts (e.g. "Long Range") |
| `--font-rating` | Science Gothic (600 only) | The percentage label inside `RatingRing` |

Tailwind's `text-*` utilities override the `@layer base` element defaults, so the design tokens set sane fallbacks (`h1`/`h2`/`h3`/`label`/`button`/`input` sizes and weights) without fighting component-level overrides.

### Color tokens & theming

Tokens are defined as CSS custom properties in `src/styles/theme.css` under `:root` and `.dark`, then re-exposed to Tailwind via `@theme inline` (`--color-background`, `--color-card`, `--color-teritary`, etc.). **Known gap:** the `.dark` class is defined but never actually applied anywhere in the app — the UI achieves its dark look by hardcoding dark hex values directly in components (`bg-[#0a0909]`, `text-[#fafafa]`, …) rather than through the token system. Any untouched shadcn primitive that relies on the `--card` / `--muted` / `--accent` tokens for contrast should be checked before reuse, since those tokens are still tuned for a light `:root` that's not what's on screen.

### Layout & components

- `Container` — the base card/panel wrapper used throughout (rounded corners, hairline border, `#121111`-ish surface).
- `AppLayout` — the shared shell: side nav (`SideNav.tsx`, icon-only rail with per-item 3D icons via `NavIcon.tsx`), sticky top nav (`TopNavBar.tsx`), breadcrumb slot, footer.
- `WeaponCard` — compact weapon tile (image, name, type tag) reused across Meta lists, homepage, and the builder's weapon picker; supports a `selected`/`disabled` picker mode and an optional single-instance WebGL flame effect (`FireCardEffect`) for a standout card (e.g. #1 meta weapon).
- `RatingRing` — circular percentage indicator (loadout score, weapon meta score).
- `ReactionButton` — like/dislike/favorite control with a tinted-idle state and success animation.
- `Tag` / `FilterPill` — category and playstyle chips.
- `QRCodeCanvas` + `generatePlainQRPng` / `generateBrandedQRPng` — loadout share codes, downloadable as PNG.
- `PasswordStrengthMeter` — live strength feedback on signup (min length + number + special character, enforced in `utils/password.ts`).
- `Countdown` — homepage release-date countdown, accent-colored per game.

### Weapon image annotations

`WeaponImage` (`src/components/molecules/WeaponImage.tsx`) renders a weapon photo with two independent overlay systems, both keyed by `attachment_types.slug`:

1. **Badges** — small icon chips for each equipped attachment, arranged around a **fixed oval layout**, not the actual location of that part on the gun. Each slug has its own hand-set angle (`OVAL_ANGLE_PERCENT` in `weaponAttachmentBadgePositions.ts`, 0–100% clockwise from 12 o'clock — e.g. `optic: 0`, `stock: 22`, `muzzle: 78`), so positions can be tuned per-slot independent of how many attachments happen to be equipped. Hovering a badge and hovering the corresponding row in the loadout's attachment list are wired together bidirectionally (shared `activeKey` state, matched by slot) — hovering either one enlarges/highlights the badge and highlights the row.
2. **Highlight regions** — an optional yellow tint over the part of the *actual* weapon photo an attachment occupies (anatomically positioned in `weaponAttachmentHighlightRegions.ts`, front/muzzle on the left through stock on the right — the opposite design intent from the badges above). Rendered as a `mix-blend-mode: color` rectangle over the grayscale image, so the region reads as "this part turned yellow" while keeping the photo's original shading and highlights. Currently wired into `LoadoutBuilder` only, so the weapon preview lights up the relevant square in real time as you add/remove attachments.

Both systems support per-weapon coordinate overrides (keyed by `weapons.id`) for images that are framed or cropped unusually.

### Motion

- CSS keyframe marquees (`marquee-up`/`marquee-down`) drive the auto-scrolling loadout showcase on the Join page; disabled under `prefers-reduced-motion`.
- `FireCardEffect` layers a WebGL shader flame along a card's edge — deliberately reserved for a single card at a time, since each instance opens its own WebGL context.
- Client-side navigation resets scroll to the top on every route change (`ScrollToTop` in `App.tsx`) — otherwise React Router preserves the browser's scroll offset across `pushState` navigations, which reads as the new page landing "mid-scroll."

---

## 5. Notable implementation details

- **Legacy links stay alive.** URL shapes that changed (`/loadout/:id` → `/l/:id`) redirect rather than 404, so old Discord messages / QR codes keep working.
- **`ComponentTest.tsx`** is a gitignored, local-only scratch page for previewing components in isolation; `App.tsx` loads it via `import.meta.glob` so its route silently disappears from builds (like Vercel's) that don't have the file on disk, instead of breaking them.
- **Legal pages** (`/privacy`, `/terms`) are hand-authored, matched to what the app actually collects (email/password or Google OAuth identity, nickname, avatar, role tag, loadout content, `localStorage` session token) rather than generic boilerplate; linked from the footer and from the signup form.

---

## 6. Known gaps / follow-ups

- `.dark` theming class is unused in practice — see [Color tokens & theming](#color-tokens--theming).
- `GAME_SELECTOR_ENABLED` is `false`; multi-game routing, the navbar game switcher, and the footer game list are all implemented but gated off until games besides MW4 are ready.
- `SCHEMA.sql`'s relational loadout tables don't reflect the live write path (see [Backend](#backend)) — useful as a historical/reference design, not as ground truth for how loadouts are actually stored.
- The yellow attachment-highlight overlay is only wired into the builder; extending it to the public loadout preview/explore cards would need a decision on how it should coexist visually with the badge icons already there.
