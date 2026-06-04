# LOADOUTIZE Database Schema

## Schema Design for Supabase PostgreSQL

This document contains the SQL schema to be run in your Supabase dashboard.

### 1. Games Table

```sql
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

-- Insert games
INSERT INTO games (id, name, slug, has_weapon_categories, has_attachments, has_perks, has_classes) VALUES
  ('blackops7', 'Black Ops 7', 'blackops7', true, true, true, false),
  ('warzone', 'Warzone', 'warzone', true, true, true, false),
  ('bf6', 'Battlefield 6', 'bf6', true, true, true, true),
  ('thefinals', 'The Finals', 'thefinals', false, false, false, true);
```

### 2. Weapon Categories Table

```sql
CREATE TABLE weapon_categories (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE(game_id, slug)
);

-- Black Ops 7 / Warzone categories
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
  ('warzone', 'Marksman Rifle', 'marksman', 5);

-- BF6 categories
INSERT INTO weapon_categories (game_id, name, slug, display_order) VALUES
  ('bf6', 'Assault Rifle', 'ar', 1),
  ('bf6', 'Carbine', 'carbine', 2),
  ('bf6', 'DMR', 'dmr', 3),
  ('bf6', 'LMG', 'lmg', 4),
  ('bf6', 'Sniper Rifle', 'sniper', 5),
  ('bf6', 'SMG', 'smg', 6);
```

### 3. Weapons Table

```sql
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
```

### 4. Attachment Types Table

```sql
CREATE TABLE attachment_types (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE(game_id, slug)
);

-- Black Ops 7 attachment types
INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Optic', 'optic', 1),
  ('blackops7', 'Muzzle', 'muzzle', 2),
  ('blackops7', 'Barrel', 'barrel', 3),
  ('blackops7', 'Underbarrel', 'underbarrel', 4),
  ('blackops7', 'Magazine', 'magazine', 5),
  ('blackops7', 'Stock', 'stock', 6),
  ('blackops7', 'Rear Grip', 'rear_grip', 7);

-- Warzone attachment types
INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('warzone', 'Optic', 'optic', 1),
  ('warzone', 'Muzzle', 'muzzle', 2),
  ('warzone', 'Barrel', 'barrel', 3),
  ('warzone', 'Underbarrel', 'underbarrel', 4),
  ('warzone', 'Magazine', 'magazine', 5);

-- BF6 attachment types
INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('bf6', 'Sight', 'sight', 1),
  ('bf6', 'Muzzle', 'muzzle', 2),
  ('bf6', 'Barrel', 'barrel', 3),
  ('bf6', 'Underbarrel', 'underbarrel', 4),
  ('bf6', 'Magazine', 'magazine', 5);
```

### 5. Attachments Table

```sql
CREATE TABLE attachments (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  attachment_type_id INTEGER REFERENCES attachment_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  stats JSONB, -- Store stat modifications as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_game ON attachments(game_id);
CREATE INDEX idx_attachments_type ON attachments(attachment_type_id);
```

### 6. Perk Types Table (for games with perk categories)

```sql
CREATE TABLE perk_types (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  UNIQUE(game_id, slug)
);

-- Black Ops 7 perk types
INSERT INTO perk_types (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Perk 1', 'perk_1', 1),
  ('blackops7', 'Perk 2', 'perk_2', 2),
  ('blackops7', 'Perk 3', 'perk_3', 3);

-- Warzone perk types
INSERT INTO perk_types (game_id, name, slug, display_order) VALUES
  ('warzone', 'Base Perk', 'base', 1),
  ('warzone', 'Bonus Perk', 'bonus', 2),
  ('warzone', 'Ultimate Perk', 'ultimate', 3);
```

### 7. Perks Table

```sql
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
```

### 8. Classes Table (for The Finals and BF6)

```sql
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  UNIQUE(game_id, slug)
);

-- The Finals classes
INSERT INTO classes (game_id, name, slug, description) VALUES
  ('thefinals', 'Light', 'light', 'Fast and agile combat specialist'),
  ('thefinals', 'Medium', 'medium', 'Versatile all-around fighter'),
  ('thefinals', 'Heavy', 'heavy', 'Tank with high health and firepower');

-- BF6 classes
INSERT INTO classes (game_id, name, slug, description) VALUES
  ('bf6', 'Assault', 'assault', 'Frontline combat specialist'),
  ('bf6', 'Medic', 'medic', 'Support healer and reviver'),
  ('bf6', 'Engineer', 'engineer', 'Vehicle and gadget specialist'),
  ('bf6', 'Recon', 'recon', 'Long-range reconnaissance');
```

### 9. Specializations Table (for The Finals special abilities)

```sql
CREATE TABLE specializations (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'ability', 'gadget', 'weapon_special'
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_specializations_class ON specializations(class_id);
```

### 10. Loadouts Table

```sql
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
```

### 11. Loadout Weapons Table (many-to-many)

```sql
CREATE TABLE loadout_weapons (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  weapon_id TEXT REFERENCES weapons(id) ON DELETE CASCADE,
  slot INTEGER NOT NULL, -- 1 = primary, 2 = secondary
  attachments INTEGER[] -- Array of attachment IDs
);

CREATE INDEX idx_loadout_weapons_loadout ON loadout_weapons(loadout_id);
```

### 12. Loadout Perks Table (many-to-many)

```sql
CREATE TABLE loadout_perks (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  perk_id INTEGER REFERENCES perks(id) ON DELETE CASCADE,
  slot INTEGER
);

CREATE INDEX idx_loadout_perks_loadout ON loadout_perks(loadout_id);
```

### 13. Loadout Specializations Table (for The Finals)

```sql
CREATE TABLE loadout_specializations (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  specialization_id INTEGER REFERENCES specializations(id) ON DELETE CASCADE
);

CREATE INDEX idx_loadout_specializations_loadout ON loadout_specializations(loadout_id);
```

### 14. Equipment Table (grenades, tactical, etc.)

```sql
CREATE TABLE equipment (
  id SERIAL PRIMARY KEY,
  game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lethal', 'tactical', 'field_upgrade'
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_equipment_game ON equipment(game_id);
```

### 15. Loadout Equipment Table

```sql
CREATE TABLE loadout_equipment (
  id SERIAL PRIMARY KEY,
  loadout_id TEXT REFERENCES loadouts(id) ON DELETE CASCADE,
  equipment_id INTEGER REFERENCES equipment(id) ON DELETE CASCADE,
  slot INTEGER
);

CREATE INDEX idx_loadout_equipment_loadout ON loadout_equipment(loadout_id);
```

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on loadouts
ALTER TABLE loadouts ENABLE ROW LEVEL SECURITY;

-- Users can view all public loadouts
CREATE POLICY "Public loadouts are viewable by everyone"
  ON loadouts FOR SELECT
  USING (is_public = true);

-- Users can view their own loadouts
CREATE POLICY "Users can view own loadouts"
  ON loadouts FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can create loadouts
CREATE POLICY "Users can create loadouts"
  ON loadouts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own loadouts
CREATE POLICY "Users can update own loadouts"
  ON loadouts FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Users can delete their own loadouts
CREATE POLICY "Users can delete own loadouts"
  ON loadouts FOR DELETE
  USING (auth.uid()::text = user_id);
```

## Instructions

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/yvvuitjsunankrffcpck
2. Navigate to the SQL Editor
3. Run each CREATE TABLE statement in order
4. Run the INSERT statements to populate initial data
5. Apply the RLS policies for security

After running these, the backend code will need to be updated to use these tables instead of the KV store.
