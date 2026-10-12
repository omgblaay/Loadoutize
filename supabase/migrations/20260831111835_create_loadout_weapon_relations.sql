-- One loadout has up to N weapon slots, each referencing a catalog weapon.
CREATE TABLE loadout_weapons (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  weapon_id TEXT REFERENCES weapons(id) ON DELETE CASCADE,
  slot_order INTEGER DEFAULT 0
);

CREATE INDEX idx_loadout_weapons_loadout ON loadout_weapons(loadout_id);
CREATE INDEX idx_loadout_weapons_weapon ON loadout_weapons(weapon_id);

ALTER TABLE loadout_weapons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public loadout weapons are viewable by everyone"
  ON loadout_weapons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loadouts l WHERE l.id = loadout_weapons.loadout_id AND l.is_public = true
  ));

CREATE POLICY "Users can view own loadout weapons"
  ON loadout_weapons FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loadouts l WHERE l.id = loadout_weapons.loadout_id AND auth.uid()::text = l.user_id
  ));

CREATE POLICY "Users can manage own loadout weapons"
  ON loadout_weapons FOR ALL
  USING (EXISTS (
    SELECT 1 FROM loadouts l WHERE l.id = loadout_weapons.loadout_id AND auth.uid()::text = l.user_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM loadouts l WHERE l.id = loadout_weapons.loadout_id AND auth.uid()::text = l.user_id
  ));

-- Each weapon slot can have multiple attachments (many attachments -> one slot).
CREATE TABLE loadout_weapon_attachments (
  id SERIAL PRIMARY KEY,
  loadout_weapon_id INTEGER REFERENCES loadout_weapons(id) ON DELETE CASCADE,
  attachment_id INTEGER REFERENCES attachments(id) ON DELETE CASCADE,
  UNIQUE (loadout_weapon_id, attachment_id)
);

CREATE INDEX idx_lwa_loadout_weapon ON loadout_weapon_attachments(loadout_weapon_id);

ALTER TABLE loadout_weapon_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public loadout weapon attachments are viewable by everyone"
  ON loadout_weapon_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loadout_weapons lw
    JOIN loadouts l ON l.id = lw.loadout_id
    WHERE lw.id = loadout_weapon_attachments.loadout_weapon_id AND l.is_public = true
  ));

CREATE POLICY "Users can view own loadout weapon attachments"
  ON loadout_weapon_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM loadout_weapons lw
    JOIN loadouts l ON l.id = lw.loadout_id
    WHERE lw.id = loadout_weapon_attachments.loadout_weapon_id AND auth.uid()::text = l.user_id
  ));

CREATE POLICY "Users can manage own loadout weapon attachments"
  ON loadout_weapon_attachments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM loadout_weapons lw
    JOIN loadouts l ON l.id = lw.loadout_id
    WHERE lw.id = loadout_weapon_attachments.loadout_weapon_id AND auth.uid()::text = l.user_id
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM loadout_weapons lw
    JOIN loadouts l ON l.id = lw.loadout_id
    WHERE lw.id = loadout_weapon_attachments.loadout_weapon_id AND auth.uid()::text = l.user_id
  ));
;
