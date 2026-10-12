CREATE TABLE loadout_perks (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  perk_id INTEGER REFERENCES perks(id) ON DELETE CASCADE,
  UNIQUE (loadout_id, perk_id)
);

CREATE INDEX idx_loadout_perks_loadout ON loadout_perks(loadout_id);
CREATE INDEX idx_loadout_perks_perk ON loadout_perks(perk_id);

ALTER TABLE loadout_perks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public loadout perks are viewable by everyone"
  ON loadout_perks FOR SELECT
  USING (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_perks.loadout_id AND l.is_public = true));

CREATE POLICY "Users can view own loadout perks"
  ON loadout_perks FOR SELECT
  USING (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_perks.loadout_id AND auth.uid()::text = l.user_id));

CREATE POLICY "Users can manage own loadout perks"
  ON loadout_perks FOR ALL
  USING (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_perks.loadout_id AND auth.uid()::text = l.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_perks.loadout_id AND auth.uid()::text = l.user_id));

CREATE TABLE loadout_equipment (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  UNIQUE (loadout_id, equipment_id)
);

CREATE INDEX idx_loadout_equipment_loadout ON loadout_equipment(loadout_id);
CREATE INDEX idx_loadout_equipment_equipment ON loadout_equipment(equipment_id);

ALTER TABLE loadout_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public loadout equipment are viewable by everyone"
  ON loadout_equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_equipment.loadout_id AND l.is_public = true));

CREATE POLICY "Users can view own loadout equipment"
  ON loadout_equipment FOR SELECT
  USING (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_equipment.loadout_id AND auth.uid()::text = l.user_id));

CREATE POLICY "Users can manage own loadout equipment"
  ON loadout_equipment FOR ALL
  USING (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_equipment.loadout_id AND auth.uid()::text = l.user_id))
  WITH CHECK (EXISTS (SELECT 1 FROM loadouts l WHERE l.id = loadout_equipment.loadout_id AND auth.uid()::text = l.user_id));
;
