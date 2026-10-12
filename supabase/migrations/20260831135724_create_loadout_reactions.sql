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

ALTER TABLE loadouts DROP COLUMN likes;
;
