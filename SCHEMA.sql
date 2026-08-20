-- LOADOUTIZE Database Schema
-- Run this file in your Supabase SQL Editor.
--
-- IMPORTANT ORDERING: this schema references directus_files(id) via plain
-- UUID columns (no FK constraint yet, so this file is safe to run before or
-- after Directus's first boot). Once Directus has booted at least once
-- against this database (creating its own directus_* system tables), run
-- 09-schema-fk.sql (or the ALTER TABLE block at the bottom of this file) to
-- attach the real foreign keys. Re-running this file is safe at any point
-- during setup/iteration.

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP VIEW IF EXISTS attachments_with_images;
DROP TABLE IF EXISTS loadouts CASCADE;
DROP TABLE IF EXISTS specializations CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS perks CASCADE;
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "Logo" UUID
);

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
  ('warzone', 'Marksman Rifle', 'marksman', 3),
  ('bf6', 'Assault Rifle', 'ar', 1),
  ('bf6', 'Carbine', 'carbine', 2),
  ('bf6', 'DMR', 'dmr', 3),
  ('bf6', 'LMG', 'lmg', 4),
  ('bf6', 'Sniper Rifle', 'sniper', 5),
  ('bf6', 'SMG', 'smg', 6);

-- 3. Weapons Table
-- `image` is a plain UUID (no FK yet, see note at top of file) pointing at a
-- directus_files.id once Directus manages uploads for this row.
CREATE TABLE weapons (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES weapon_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  image UUID,
  damage INTEGER,
  fire_rate INTEGER,
  range INTEGER,
  accuracy INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_weapons_game ON weapons(game_id);
CREATE INDEX idx_weapons_category ON weapons(category_id);

INSERT INTO weapons (id, game_id, category_id, name, damage, fire_rate) VALUES
  ('xm4', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'XM4', 42, 750),
  ('ak47', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'AK-47', 48, 600),
  ('mp5', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'MP5', 35, 900),
  ('mac10', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'MAC-10', 32, 1100),
  ('pelington', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'sniper'), 'Pelington 703', 100, 50),
  ('grau', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'Grau 5.56', 40, 750),
  ('kar98', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'marksman'), 'Kar98k', 95, 45),
  ('fennec', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Fennec', 30, 1100);

-- 4. Attachment Types Table
CREATE TABLE attachment_types (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  image UUID,
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
-- image is optional: falls back to attachment_type.image if null (see view below)
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  attachment_type_id INTEGER REFERENCES attachment_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image UUID,
  description TEXT,
  stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_game ON attachments(game_id);
CREATE INDEX idx_attachments_type ON attachments(attachment_type_id);

CREATE VIEW attachments_with_images AS
SELECT
  a.id,
  a.game_id,
  a.attachment_type_id,
  a.name,
  COALESCE(a.image, at.image) as image,
  a.description,
  a.stats,
  a.created_at,
  at.name as type_name,
  at.slug as type_slug
FROM attachments a
LEFT JOIN attachment_types at ON a.attachment_type_id = at.id;

INSERT INTO attachments (game_id, attachment_type_id, name) VALUES
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'optic'), 'Reflex'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'optic'), 'Holographic'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'optic'), 'ACOG 3x'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'optic'), 'Thermal 4x'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'muzzle'), 'Suppressor'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'muzzle'), 'Compensator'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'muzzle'), 'Muzzle Brake'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'muzzle'), 'Flash Guard'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'barrel'), 'Extended'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'barrel'), 'Reinforced Heavy'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'barrel'), 'Ranger'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'barrel'), 'Task Force'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'underbarrel'), 'Foregrip'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'underbarrel'), 'Bipod'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'underbarrel'), 'Field Agent Grip'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'underbarrel'), 'Bruiser Grip'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'magazine'), 'Fast Mag'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'magazine'), 'Extended Mag'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'magazine'), 'STANAG 60 Rnd'),
  ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'magazine'), 'Salvo 50 Rnd');

-- 6. Perks Table
-- Flat pool per game (no perk-slot concept in the current UI, unlike the
-- fully-slotted design in earlier drafts of this schema).
CREATE TABLE perks (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image UUID,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_perks_game ON perks(game_id);

INSERT INTO perks (game_id, name, display_order) VALUES
  ('blackops7', 'Ghost', 1), ('blackops7', 'Quick Fix', 2), ('blackops7', 'Scavenger', 3),
  ('blackops7', 'Cold Blooded', 4), ('blackops7', 'Ninja', 5), ('blackops7', 'Gung-Ho', 6),
  ('blackops7', 'Tracker', 7), ('blackops7', 'Engineer', 8),
  ('warzone', 'Ghost', 1), ('warzone', 'Quick Fix', 2), ('warzone', 'Scavenger', 3),
  ('warzone', 'Cold Blooded', 4), ('warzone', 'Ninja', 5), ('warzone', 'Gung-Ho', 6),
  ('warzone', 'Tracker', 7), ('warzone', 'Engineer', 8);

-- 7. Equipment Table (lethals/tacticals)
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  image UUID,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equipment_game ON equipment(game_id);

INSERT INTO equipment (game_id, name, display_order) VALUES
  ('blackops7', 'Frag Grenade', 1), ('blackops7', 'Semtex', 2), ('blackops7', 'Flashbang', 3),
  ('blackops7', 'Smoke Grenade', 4), ('blackops7', 'Stun Grenade', 5), ('blackops7', 'Molotov', 6),
  ('warzone', 'Frag Grenade', 1), ('warzone', 'Semtex', 2), ('warzone', 'Flashbang', 3),
  ('warzone', 'Smoke Grenade', 4), ('warzone', 'Stun Grenade', 5), ('warzone', 'Molotov', 6);

-- 8. Classes Table (for The Finals and BF6 -- not yet wired into the frontend)
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image UUID,
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

-- 9. Specializations Table (for The Finals special abilities -- not yet wired into the frontend)
CREATE TABLE specializations (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ability', 'gadget', 'weapon_special'
  description TEXT,
  image UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_specializations_class ON specializations(class_id);

-- 10. Loadouts Table
-- Pragmatic (non-normalized) shape that mirrors what LoadoutBuilder.tsx
-- already sends/expects: weapons is a JSONB array of embedded weapon
-- objects (not weapon_id references), perks/equipment are plain name
-- arrays. This avoids a larger loadout-builder rewrite; normalizing into
-- proper junction tables (loadout_weapons/loadout_perks/loadout_equipment)
-- is future work if/when the builder is changed to pick catalog items by ID.
CREATE TABLE loadouts (
  id TEXT PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  weapons JSONB DEFAULT '[]'::jsonb,
  perks TEXT[] DEFAULT '{}',
  equipment TEXT[] DEFAULT '{}',
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

-- NOTE: the edge function backend (supabase/functions/server/index.tsx) uses
-- the Supabase service role key, which bypasses RLS -- these policies exist
-- so Directus (or any other client using anon/authenticated Supabase keys)
-- still gets sane defaults if it ever queries loadouts directly.

-- ============================================================================
-- Run this block ONLY after Directus has booted at least once against this
-- database (so directus_files exists). Safe to run standalone/repeatedly.
-- ============================================================================
-- ALTER TABLE weapons            ADD CONSTRAINT weapons_image_fkey            FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
-- ALTER TABLE attachment_types   ADD CONSTRAINT attachment_types_image_fkey   FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
-- ALTER TABLE attachments        ADD CONSTRAINT attachments_image_fkey        FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
-- ALTER TABLE perks              ADD CONSTRAINT perks_image_fkey              FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
-- ALTER TABLE equipment          ADD CONSTRAINT equipment_image_fkey          FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
-- ALTER TABLE classes            ADD CONSTRAINT classes_image_fkey            FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
-- ALTER TABLE specializations    ADD CONSTRAINT specializations_image_fkey    FOREIGN KEY (image) REFERENCES directus_files(id) ON DELETE SET NULL;
