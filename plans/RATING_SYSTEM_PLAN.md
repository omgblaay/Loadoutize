# Plan: Loadout Rating System (Likes / Dislikes / Favorites)

## Current state (why this is needed)

- `loadouts` has a single `likes INTEGER` counter and a `views INTEGER` counter. No `dislikes`, no `favorites`.
- `POST /loadouts/:id/like` (`index.tsx`) has **no auth check** and just does
  `likes = likes + 1` with no per-user record — anyone can click Upvote
  repeatedly and inflate the count indefinitely. There is no way to unlike.
- `LoadoutPreview.tsx` already has the UI for all three reactions, but two are
  inert:
  - Upvote (`ThumbsUp`, line ~312) calls the real `likeLoadout()`.
  - Downvote (`ThumbsDown`, line ~321) is `disabled` with
    `title="Downvotes aren't tracked yet"` — dead button.
  - "Add to favorites" (`Heart`, line ~330) has no `onClick` at all — dead button.
- `LoadoutCard.tsx`'s rating ring is **entirely fake**:
  `const rating = 95 + (index % 2) * 3;` — not derived from any real data.
- `GameDashboard.tsx` only sorts by raw `likes` (`sortMode: "likes" | "newest"`).

## Rating design

Two different numbers for two different jobs — don't try to make one
formula serve both:

1. **Displayed rating (the % ring)** — an approval percentage, like Steam
   reviews:
   ```
   percent = (likes + favorites * 1.5) / (likes + favorites * 1.5 + dislikes)
   ```
   Favorites count for more than a like (bookmarking a loadout to reuse is a
   stronger signal than a low-effort thumbs-up). Below a minimum vote count
   (e.g. `likes + dislikes + favorites < 3`), don't show a misleading 100%/0%
   — render the ring in a neutral "not enough data yet" state instead of a
   fabricated number.
2. **Sort/rank score ("Top" sort, and any future "Trending")** — a plain
   point total, separate from the percentage:
   ```
   score = likes + 2 * favorites - dislikes
   ```
   A points total is volume-aware (10 net-positive reactions ranks below
   500), which a raw percentage can't express — a 1/0/0 loadout and a
   500/0/50 loadout would both show ~100% but shouldn't rank the same.
   "Trending" (if ever added) would be this same score with a time-decay
   factor à la Reddit's hot ranking — not in scope for the first pass.

## Data model

Reactions need to be **per-user rows**, not blind counters, both to fix the
click-spam gap and because "did *I* already react?" is required to render
button state (highlighted Upvote, etc.) and to make un-reacting possible.

```sql
CREATE TABLE loadout_reactions (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike', 'favorite')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (loadout_id, user_id, type)
);

CREATE INDEX idx_loadout_reactions_loadout ON loadout_reactions(loadout_id);
CREATE INDEX idx_loadout_reactions_user ON loadout_reactions(user_id);
```

`like` and `dislike` are mutually exclusive per user (setting one clears the
other — enforced in the endpoint, not the DB, same pattern as
`saveLoadoutWeapons` doing delete-then-insert); `favorite` is independent
and can coexist with either.

Drop `loadouts.likes` once this ships — the existing counts have no
per-user attribution to backfill from (it was always just a blind counter,
which is the exact integrity gap this plan fixes), so there's nothing
trustworthy to migrate. `views` is unrelated (no per-user identity needed
for a view count) and stays as-is.

RLS: unlike `loadout_weapons` (owned/managed only by the *loadout's* owner),
a reaction row is owned by the *reacting* user regardless of who owns the
loadout:
```sql
ALTER TABLE loadout_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions on visible loadouts are publicly readable"
  ON loadout_reactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loadouts l
    WHERE l.id = loadout_reactions.loadout_id
      AND (l.is_public = true OR auth.uid()::text = l.user_id)
  ));

CREATE POLICY "Users manage their own reactions"
  ON loadout_reactions FOR ALL
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
```

## Backend (`supabase/functions/server/index.tsx`)

- **Replace** `POST /loadouts/:id/like` with
  `POST /loadouts/:id/react` — body `{ type: 'like' | 'dislike' | 'favorite' }`,
  **requires auth** (unlike today). Toggle semantics:
  - If the same `(user, loadout, type)` row exists, delete it (un-react).
  - Else insert it; if `type` is `like`, first delete any existing
    `dislike` row for that user+loadout (and vice versa).
- **`mapLoadout`**: join `loadout_reactions`, return counts
  (`likes`, `dislikes`, `favorites`) computed from the rows instead of a
  stored column, plus the *requesting* user's own reaction state
  (`myReaction: 'like' | 'dislike' | 'favorite' | null`, or an object with
  independent `liked`/`disliked`/`favorited` booleans since favorite can
  coexist with like/dislike) so the frontend can highlight active buttons
  without a second request. Compute `score` and `ratingPercent` server-side
  too, so the frontend doesn't duplicate the formula.
- Drop the old `/view` increment's coupling to `likes` — unaffected, keep
  as-is.

## Frontend

- **`LoadoutPreview.tsx`**: wire Upvote/Downvote/Favorite to
  `POST /loadouts/:id/react`, using `loadout.myReaction`/booleans returned
  from the API to show active/inactive button state (e.g. filled vs outline
  icon) instead of the current always-neutral styling. Remove the
  `disabled`/"aren't tracked yet" state from Downvote and add a real
  `onClick` to the Favorite button. Show real `dislikes`/`favorites` counts
  next to their icons instead of the hardcoded `0`.
- **`LoadoutCard.tsx`**: replace the fake `rating` calculation with
  `loadout.ratingPercent` from the API; render the "not enough data" neutral
  state in `RatingRing` when vote count is below the threshold instead of
  always drawing a percentage.
- **`GameDashboard.tsx`**: sort by `loadout.score` instead of raw `likes`
  for the "Most liked" (rename to "Top") option; sorting logic itself
  (`sorted = [...filtered].sort(...)`) doesn't otherwise change.

## Sequencing

1. Migration: `loadout_reactions` table + RLS, drop `loadouts.likes`.
2. Backend: `/react` endpoint (with auth), `mapLoadout` reaction
   aggregation + rating formulas, deploy edge function.
3. Frontend: wire the three buttons in `LoadoutPreview.tsx` to real state.
4. Frontend: real `RatingRing` data in `LoadoutCard.tsx`, "Top" sort using
   `score` in `GameDashboard.tsx`.
5. *Optional, later*: a "My Favorites" filtered view; time-decayed
   "Trending" sort; Directus visibility into `loadout_reactions`
   (read-only, same hidden-junction pattern as `loadout_weapons`) for
   moderating abuse.

## Open question

The favorite weight (`1.5`) and score weights (`2` for favorites) above are
starting guesses, not measured — worth revisiting once there's real usage
data on how favorite vs. like frequency compares in this app.
