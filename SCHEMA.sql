-- LOADOUTIZE Database Schema
-- Run this file in your Supabase SQL Editor

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS loadout_equipment CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS loadout_specializations CASCADE;
DROP TABLE IF EXISTS loadout_perks CASCADE;
DROP TABLE IF EXISTS loadout_weapons CASCADE;
DROP TABLE IF EXISTS loadouts CASCADE;
DROP TABLE IF EXISTS specializations CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS perks CASCADE;
DROP TABLE IF EXISTS perk_types CASCADE;
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS attachment_types CASCADE;
DROP TABLE IF EXISTS weapons CASCADE;
DROP TABLE IF EXISTS weapon_categories CASCADE;
DROP TABLE IF EXISTS games CASCADE;

-- 1. Games Table
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  has_weapon_categories BOOLEAN DEFAULT true,
  has_attachments BOOLEAN DEFAULT true,
  has_perks BOOLEAN DEFAULT true,
  has_classes BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert games first
INSERT INTO games (id, name, slug, has_weapon_categories, has_attachments, has_perks, has_classes) VALUES
  ('blackops7', 'Black Ops 7', 'blackops7', true, true, true, false),
  ('warzone', 'Warzone', 'warzone', true, true, true, false),
  ('bf6', 'Battlefield 6', 'bf6', true, true, true, true),
  ('thefinals', 'The Finals', 'thefinals', false, false, false, true);

-- 2. Weapon Categories Table
CREATE TABLE weapon_categories (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE(game_id, slug)
);

INSERT INTO weapon_categories (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Assault Rifle', 'ar', 1),
  ('blackops7', 'SMG', 'smg', 2),
  ('blackops7', 'Sniper', 'sniper', 3),
  ('blackops7', 'LMG', 'lmg', 4),
  ('blackops7', 'Marksman Rifle', 'marksman', 5),
  ('warzone', 'Assault Rifle', 'ar', 1),
  ('warzone', 'SMG', 'smg', 2),
  ('warzone', 'Sniper', 'sniper', 3),
  ('warzone', 'LMG', 'lmg', 4),
  ('warzone', 'Marksman Rifle', 'marksman', 5),
  ('bf6', 'Assault Rifle', 'ar', 1),
  ('bf6', 'Carbine', 'carbine', 2),
  ('bf6', 'DMR', 'dmr', 3),
  ('bf6', 'LMG', 'lmg', 4),
  ('bf6', 'Sniper Rifle', 'sniper', 5),
  ('bf6', 'SMG', 'smg', 6);

-- 3. Weapons Table
CREATE TABLE weapons (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES weapon_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  damage INTEGER,
  fire_rate INTEGER,
  range INTEGER,
  accuracy INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weapons_game ON weapons(game_id);
CREATE INDEX idx_weapons_category ON weapons(category_id);

-- 4. Attachment Types Table
CREATE TABLE attachment_types (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  UNIQUE(game_id, slug)
);

INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Optic', 'optic', 1),
  ('blackops7', 'Muzzle', 'muzzle', 2),
  ('blackops7', 'Barrel', 'barrel', 3),
  ('blackops7', 'Underbarrel', 'underbarrel', 4),
  ('blackops7', 'Magazine', 'magazine', 5),
  ('blackops7', 'Stock', 'stock', 6),
  ('blackops7', 'Rear Grip', 'rear_grip', 7),
  ('warzone', 'Optic', 'optic', 1),
  ('warzone', 'Muzzle', 'muzzle', 2),
  ('warzone', 'Barrel', 'barrel', 3),
  ('warzone', 'Underbarrel', 'underbarrel', 4),
  ('warzone', 'Magazine', 'magazine', 5),
  ('bf6', 'Sight', 'sight', 1),
  ('bf6', 'Muzzle', 'muzzle', 2),
  ('bf6', 'Barrel', 'barrel', 3),
  ('bf6', 'Underbarrel', 'underbarrel', 4),
  ('bf6', 'Magazine', 'magazine', 5);

-- 5. Attachments Table
-- Note: image_url is optional - if null, will fall back to attachment_type.image_url
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  attachment_type_id INTEGER REFERENCES attachment_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT, -- Optional: falls back to attachment_type.image_url if null
  description TEXT,
  stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_game ON attachments(game_id);
CREATE INDEX idx_attachments_type ON attachments(attachment_type_id);

-- Helper view to get attachment with fallback image
CREATE VIEW attachments_with_images AS
SELECT
  a.id,
  a.game_id,
  a.attachment_type_id,
  a.name,
  COALESCE(a.image_url, at.image_url) as image_url, -- Use attachment image or fall back to type image
  a.description,
  a.stats,
  a.created_at,
  at.name as type_name,
  at.slug as type_slug
FROM attachments a
LEFT JOIN attachment_types at ON a.attachment_type_id = at.id;

-- 6. Perk Types Table
CREATE TABLE perk_types (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE(game_id, slug)
);

INSERT INTO perk_types (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Perk 1', 'perk_1', 1),
  ('blackops7', 'Perk 2', 'perk_2', 2),
  ('blackops7', 'Perk 3', 'perk_3', 3),
  ('warzone', 'Base Perk', 'base', 1),
  ('warzone', 'Bonus Perk', 'bonus', 2),
  ('warzone', 'Ultimate Perk', 'ultimate', 3);

-- 7. Perks Table
CREATE TABLE perks (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  perk_type_id INTEGER REFERENCES perk_types(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_perks_game ON perks(game_id);
CREATE INDEX idx_perks_type ON perks(perk_type_id);

-- 8. Classes Table
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  UNIQUE(game_id, slug)
);

INSERT INTO classes (game_id, name, slug, description) VALUES
  ('thefinals', 'Light', 'light', 'Fast and agile combat specialist'),
  ('thefinals', 'Medium', 'medium', 'Versatile all-around fighter'),
  ('thefinals', 'Heavy', 'heavy', 'Tank with high health and firepower'),
  ('bf6', 'Assault', 'assault', 'Frontline combat specialist'),
  ('bf6', 'Medic', 'medic', 'Support healer and reviver'),
  ('bf6', 'Engineer', 'engineer', 'Vehicle and gadget specialist'),
  ('bf6', 'Recon', 'recon', 'Long-range reconnaissance');

-- 9. Specializations Table
CREATE TABLE specializations (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_specializations_class ON specializations(class_id);

-- 10. Loadouts Table
CREATE TABLE loadouts (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loadouts_game ON loadouts(game_id);
CREATE INDEX idx_loadouts_user ON loadouts(user_id);
CREATE INDEX idx_loadouts_likes ON loadouts(likes DESC);
CREATE INDEX idx_loadouts_created ON loadouts(created_at DESC);

-- 10b. Weapon Configs Table (standalone weapon builds for BO7, Warzone, BF6)
CREATE TABLE weapon_configs (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  weapon_id TEXT REFERENCES weapons(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  attachments INTEGER[], -- Array of attachment IDs
  likes INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weapon_configs_game ON weapon_configs(game_id);
CREATE INDEX idx_weapon_configs_weapon ON weapon_configs(weapon_id);
CREATE INDEX idx_weapon_configs_user ON weapon_configs(user_id);
CREATE INDEX idx_weapon_configs_likes ON weapon_configs(likes DESC);
CREATE INDEX idx_weapon_configs_created ON weapon_configs(created_at DESC);

-- 11. Loadout Weapons Table
CREATE TABLE loadout_weapons (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  weapon_id TEXT REFERENCES weapons(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL,
  attachments INTEGER[]
);

CREATE INDEX idx_loadout_weapons_loadout ON loadout_weapons(loadout_id);

-- 12. Loadout Perks Table
CREATE TABLE loadout_perks (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  perk_id INTEGER REFERENCES perks(id) ON DELETE CASCADE,
  slot INTEGER
);

CREATE INDEX idx_loadout_perks_loadout ON loadout_perks(loadout_id);

-- 13. Loadout Specializations Table
CREATE TABLE loadout_specializations (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  specialization_id INTEGER REFERENCES specializations(id) ON DELETE CASCADE
);

CREATE INDEX idx_loadout_specializations_loadout ON loadout_specializations(loadout_id);

-- 14. Equipment Table
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equipment_game ON equipment(game_id);

-- 15. Loadout Equipment Table
CREATE TABLE loadout_equipment (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  slot INTEGER
);

CREATE INDEX idx_loadout_equipment_loadout ON loadout_equipment(loadout_id);

-- Row Level Security for Loadouts
ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public loadouts are viewable by everyone"
  ON loadouts FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own loadouts"
  ON loadouts FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create loadouts"
  ON loadouts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own loadouts"
  ON loadouts FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own loadouts"
  ON loadouts FOR DELETE
  USING (auth.uid()::text = user_id);

-- Row Level Security for Weapon Configs
ALTER TABLE weapon_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public weapon configs are viewable by everyone"
  ON weapon_configs FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view own weapon configs"
  ON weapon_configs FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create weapon configs"
  ON weapon_configs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own weapon configs"
  ON weapon_configs FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own weapon configs"
  ON weapon_configs FOR DELETE
  USING (auth.uid()::text = user_id);
