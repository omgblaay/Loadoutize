# MW4 keyword research and page map

## What was checked

- **Google autocomplete** (`suggestqueries.google.com`, en), pulled on 11 Nov 2026. Each seed was checked as typed.
- **Not checked yet:** search volume, competition, and Search Console query data. These need Google Keyword Planner (free with any Google Ads account) and the Search Console Performance report for loadoutize.com. Both need your login. Export them and add a volume column to the table below.

## Autocomplete evidence

| Seed | Suggestions (abridged) | What it tells us |
| --- | --- | --- |
| `mw4 best loadout` | mw4 best loadout multiplayer, best mw4 loadout m4, best mw4 loadout beta, mw4 best setup, mw4 best sniper / shotgun / iso / smg loadout | Searchers name the weapon class or weapon. "beta" is stale: MW4 has launched. |
| `mw4 attachments` | mw4 apex attachments, mw4 m4 attachments, mw4 best attachments, mw4 all attachments, mw4 weapon attachments, mw4 stranded attachments | Per-weapon attachment queries are real. "apex" means the Apex attachment class. |
| `best meta loadouts` | best meta loadouts warzone / bf6 / bo7 / bo6, good meta loadouts, top meta loadouts warzone | The generic phrase is dominated by other games. The page must say "MW4" in its title and H1. |
| `mw4 best assault rifle` | mw4 beta best assault rifle, what's the best assault rifle in call of duty | Category-level intent. Good for the category page. |
| `mw4 meta` | mw4 meta weapons, mw4 meta guns, mw4 meta loadout, mw4 meta builds, mw4 meta classes, mw4 meta m4, mw4 meta m4 build | Strongest set. "mw4 meta" + weapon name is the core pattern. |

## Intent map

Each URL has one primary query. Secondary queries are only used in headings and body text that match what the page actually shows.

| URL | Primary query | Secondary queries | Page type |
| --- | --- | --- | --- |
| `/best-loadouts` | mw4 best loadouts, best mw4 loadouts | mw4 meta loadouts, best meta loadouts mw4 | Best-of hub |
| `/meta/categories/[category]` | mw4 best assault rifle (and other classes) | best mw4 sniper, mw4 smg loadouts | Category |
| `/meta/weapons/[weapon]` | [weapon] attachments mw4 | mw4 [weapon] loadout, mw4 meta [weapon] | Weapon |
| `/meta/weapons/[weapon]/best-loadout` | best [weapon] loadout mw4 | mw4 [weapon] build, [weapon] best setup | Loadout |

Example mapping, from the live weapon catalog: `m4` answers "mw4 m4 attachments" and "mw4 meta m4 build". `oden`, `kastov-762`, `cronen-osprey`, and `patriot-xmr` answer their own names.

## Publish gate

Pages are indexed only when they pass the gate in `src/lib/seo/logic.ts`:

- Weapon page: at least 3 verified community builds, and at least one of them passes the build gate.
- Build page: at least 5 votes from real accounts, or a written note of at least 120 characters.
- Category and hub: at least one weapon in them passes the weapon gate.

Pages below the gate return `noindex, follow`. Unknown weapons and builds return a real 404.

## Current status

- As of today, **0 of 30 weapons pass the gate.** Of 109 public MW4 loadouts, only **3** have a non-seeded author and no codmunity import code, and none of those 3 has any organic votes. Also, 1,526 of 1,527 reactions come from bot accounts. The pages will not be indexed until real builds and votes exist.
- The gate reads `authorIsOrganic`, `organicLikes`, and `organicDislikes`. These come from the backend change in `supabase/functions/server/index.tsx`. **That change must be deployed.** Until then the pages fail closed.
- Autocomplete supports the page map, but it gives no search volume. Use Keyword Planner to decide which weapons get pages first.
