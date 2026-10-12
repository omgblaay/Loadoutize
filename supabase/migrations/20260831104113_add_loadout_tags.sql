-- Tags: a single, optional playstyle tag per loadout, colored, per-game,
-- optionally restricted to a set of weapon categories.
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, name)
);

CREATE INDEX idx_tags_game ON tags(game_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON tags FOR SELECT USING (true);

-- Junction table: which weapon categories a tag is allowed on.
-- No rows for a tag = unrestricted (selectable regardless of weapon category).
CREATE TABLE tag_weapon_categories (
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
  weapon_category_id INTEGER REFERENCES weapon_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tag_id, weapon_category_id)
);

ALTER TABLE tag_weapon_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON tag_weapon_categories FOR SELECT USING (true);

-- A loadout may reference at most one tag.
ALTER TABLE loadouts ADD COLUMN tag_id INTEGER REFERENCES tags(id) ON DELETE SET NULL;
;
