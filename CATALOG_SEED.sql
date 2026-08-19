-- LOADOUTIZE Catalog Seed Data — Black Ops 7, Battlefield 6, Warzone, The Finals
--
-- Compiled from official Activision/EA/Embark sources and openly-licensed
-- (CC-BY-SA) community wikis (Call of Duty Wiki, Battlefield Wiki,
-- THE FINALS Wiki). NOT sourced from battlefinity.gg or codmunity.gg.
--
-- Run this AFTER SCHEMA.sql (it extends the games/categories/attachment_types
-- rows SCHEMA.sql already inserts). PARTIALLY idempotent: `games`,
-- `weapon_categories`, `attachment_types`, and `weapons` all have unique
-- constraints in SCHEMA.sql, so their ON CONFLICT DO NOTHING clauses genuinely
-- prevent duplicates on re-run. `attachments`, `specializations`, and
-- `equipment` have NO unique constraint in SCHEMA.sql (only a SERIAL id) —
-- ON CONFLICT DO NOTHING on those is a no-op, and re-running this file WILL
-- duplicate those rows. Run this file exactly once per environment, or add a
-- unique constraint (e.g. UNIQUE(game_id, attachment_type_id, name) on
-- attachments) before re-running. Weapon ids are prefixed per game
-- (bo7-/bf6-/wz-/fin-) since `weapons.id` is a global TEXT primary key, not
-- scoped per game.
--
-- KNOWN GAPS (left for a follow-up pass, not fabricated here):
--   * BF6 Barrels and Magazines are weapon-specific in-game (not a shared
--     pool like every other slot), and our schema's `attachments` table only
--     supports a flat per-type pool per game, not per-weapon attachments.
--     Research only sampled 8 of 63 BF6 weapons for these two slots, so they
--     are omitted here rather than seeding partial/misleading data. The
--     `attachment_types` rows for 'barrel' and 'magazine' already exist from
--     SCHEMA.sql; populate them per-weapon later if the schema gains
--     per-weapon attachment support.
--   * No stat data (damage/fire_rate/range/accuracy) — names + categories only.
--   * The Finals: `weapons` table has no class linkage column. Light/Medium/
--     Heavy are seeded as `weapon_categories` (mirroring the existing
--     `classes` slugs) purely so weapons can be grouped/filtered — flip
--     `games.has_weapon_categories` to true for 'thefinals' if you want the
--     frontend category filter UI to pick this up.
--   * The Finals gadgets are seeded into the generic `equipment` table (it
--     has no class-linkage column either); each row's `description` notes
--     which class(es) it belongs to.
--   * Warzone: seeded with the current-season (Season Five) Black Ops 7
--     integrated arsenal only. Warzone also carries forward a large "legacy"
--     pool (~200+ weapons from MW2019/Cold War/Vanguard/MW2/MW3/BO6) that
--     remains selectable in-game; that historical pool is out of scope here.

-- ============================================================================
-- BLACK OPS 7 (game_id = 'blackops7')
-- ============================================================================

-- --- Weapon categories (existing: ar, smg, sniper, lmg, marksman) ---
INSERT INTO weapon_categories (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Shotgun', 'shotgun', 6),
  ('blackops7', 'Handgun', 'handgun', 7),
  ('blackops7', 'Launcher', 'launcher', 8),
  ('blackops7', 'Melee', 'melee', 9),
  ('blackops7', 'Special', 'special', 10)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Weapons ---
INSERT INTO weapons (id, game_id, category_id, name) VALUES
  -- Assault Rifle
  ('bo7-ak-27', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'AK-27'),
  ('bo7-an-94', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'AN-94'),
  ('bo7-ds20-mirage', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'DS20 Mirage'),
  ('bo7-egrt-17', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'EGRT-17'),
  ('bo7-fg42', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'FG42'),
  ('bo7-m15-mod-0', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'M15 Mod 0'),
  ('bo7-maddox-rfb', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'Maddox RFB'),
  ('bo7-mk35-isr', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'MK35 ISR'),
  ('bo7-mxr-17', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'MXR-17'),
  ('bo7-peacekeeper-mk1', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'Peacekeeper Mk1'),
  ('bo7-voyak-kt-3', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'Voyak KT-3'),
  ('bo7-vx-compact', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'VX Compact'),
  ('bo7-x9-maverick', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'ar'), 'X9 Maverick'),
  -- SMG
  ('bo7-carbon-57', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Carbon 57'),
  ('bo7-cbrs-3', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'CBRS-3'),
  ('bo7-dravec-45', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Dravec 45'),
  ('bo7-gremlin', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Gremlin'),
  ('bo7-kogot-7', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Kogot-7'),
  ('bo7-mpc-25', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'MPC-25'),
  ('bo7-razor-9mm', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Razor 9mm'),
  ('bo7-rev-46', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'REV-46'),
  ('bo7-rk-9', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'RK-9'),
  ('bo7-ryden-45k', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Ryden 45K'),
  ('bo7-sturmwolf-45', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'Sturmwolf 45'),
  ('bo7-vst', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'smg'), 'VST'),
  -- LMG
  ('bo7-mammoth', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'lmg'), 'Mammoth'),
  ('bo7-mk-78', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'lmg'), 'MK.78'),
  ('bo7-sokol-545', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'lmg'), 'Sokol 545'),
  ('bo7-xm325', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'lmg'), 'XM325'),
  -- Marksman Rifle
  ('bo7-krs-7-62', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'marksman'), 'KRS-7.62'),
  ('bo7-m34-novaline', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'marksman'), 'M34 Novaline'),
  ('bo7-m8a1', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'marksman'), 'M8A1'),
  ('bo7-swordfish', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'marksman'), 'SwordFish'),
  ('bo7-warden-308', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'marksman'), 'Warden 308'),
  -- Shotgun
  ('bo7-akita', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'shotgun'), 'Akita'),
  ('bo7-echo-12', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'shotgun'), 'Echo 12'),
  ('bo7-m10-breacher', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'shotgun'), 'M10 Breacher'),
  ('bo7-sg12', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'shotgun'), 'SG12'),
  -- Sniper Rifle
  ('bo7-hawker-hx', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'sniper'), 'Hawker HX'),
  ('bo7-shadow-sk', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'sniper'), 'Shadow SK'),
  ('bo7-strider-300', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'sniper'), 'Strider 300'),
  ('bo7-vs-recon', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'sniper'), 'VS Recon'),
  ('bo7-xr-3-ion', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'sniper'), 'XR-3 Ion'),
  -- Handgun
  ('bo7-coda-9', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'handgun'), 'CODA 9'),
  ('bo7-jager-45', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'handgun'), 'Jäger 45'),
  ('bo7-m1911', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'handgun'), 'M1911'),
  ('bo7-velox-5-7', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'handgun'), 'Velox 5.7'),
  -- Launcher
  ('bo7-arc-m1', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'launcher'), 'A.R.C. M1'),
  ('bo7-aarow-109', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'launcher'), 'AAROW 109'),
  -- Melee
  ('bo7-axe', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Axe'),
  ('bo7-ballistic-knife', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Ballistic Knife'),
  ('bo7-fists', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Fists'),
  ('bo7-flatline-mk-ii', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Flatline Mk.II'),
  ('bo7-h311-saw', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'H311-SAW'),
  ('bo7-katana', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Katana'),
  ('bo7-knife', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Knife'),
  ('bo7-mace', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'melee'), 'Mace'),
  -- Special
  ('bo7-crossbow', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'special'), 'Crossbow'),
  ('bo7-gdl-havoc', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'special'), 'GDL Havoc'),
  ('bo7-grimhawk', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'special'), 'Grimhawk'),
  ('bo7-siren', 'blackops7', (SELECT id FROM weapon_categories WHERE game_id = 'blackops7' AND slug = 'special'), 'Siren')
ON CONFLICT (id) DO NOTHING;

-- --- Attachment types (existing: optic, muzzle, barrel, underbarrel, magazine, stock, rear_grip) ---
INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('blackops7', 'Laser', 'laser', 8),
  ('blackops7', 'Stock Pad', 'stock_pad', 9),
  ('blackops7', 'Comb', 'comb', 10),
  ('blackops7', 'Fire Mod', 'fire_mod', 11),
  ('blackops7', 'Ammunition', 'ammunition', 12),
  ('blackops7', 'Bolt', 'bolt', 13),
  ('blackops7', 'Trigger Action', 'trigger_action', 14)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Attachments ---
INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'optic'), x
FROM unnest(ARRAY[
  'Bowen Pixel Reflex','Bowen Scout Scope','Bowen X-25 IR','Circuit-Z Rangefinder','EAM Dual Zoom',
  'EAM Dyad xL','EAM IR-VIZ Reflex','EAM Micro Dot','EAM xL Reflex','EMT3 Holo Mk.2',
  'FANG HoverPoint ELO','Graves Ultra Zoom','Greaves AccuSpot 3x','K&S Slim Reflex','Kepler Prism-IX Mini',
  'Kepler T-Range Holo','Kepler Ultra 4x','LTI Mini','LTI Reflex','Lethal Tools ELO',
  'Millimeter Scanner','PrismaTech Digital Holo','PrismaTech Turbo 4x','Redwell 30-S 2x','RistRauch 7x',
  'Solaris Holo-IR','VAS Duo Hybrid Sight','VAS LED','VAS MicroFlex','VAS Strix 6x Thermal'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'muzzle'), x
FROM unnest(ARRAY[
  'Bowen Modulator 7.62','Breacher Precision Choke','Dual Dampener','Dual-Crown Echo Choke','Greaves A-762',
  'Greaves Ti-762','H-45 Precision Comp','H-9mm Precision Comp','Hawker Hybrid .45','Hawker Ported Comp',
  'Hawker Series 45','Hawker Stabilizer MK.II','Hawker-9 Brake','K&S Brake-2B','Kühn Ported Comp',
  'LTI Stentorian Brake','M10 CQB Choke','M10 Onyx Brake','Monolithic Suppressor','Ported-45 Brake',
  'R&S Stalker 57-X','RL-5.56 Brake','Redwell 7.62 Brake','Redwell Shade-X Suppressor','Triptych Brake',
  'VS-762 Brake'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'barrel'), x
FROM unnest(ARRAY[
  '10" Razor Impact Barrel','10.5" Greaves Whiptall Barrel','10.5" Slim-Mod Barrel','11" Racuh 6L-R Barrel','12" Cloud Barrel',
  '12" Vienna Barrel','13" RL-Genesys Barrel','14" Verse Barrel','14" Zephyr-R Barrel','14.5" E7-Cuff Barrel',
  '15" Ascend-KS Barrel','15" Fringe Barrel','15" Ghostline Barrel','15" Mirage Light Barrel','15" Skylance Barrel',
  '15" Wraith Barrel','15.5" Light Barrel','16" Reticulated Barrel','16.1" Proton Barrel','16.5" Deadeye Barrel',
  '16.5" Fusion Barrel','16.5" Predator Barrel','17" Bowen Moon Barrel','17" Greaves Scourge Barrel','17" Overload Barrel',
  '17" RistRauch Nimbus Barrel','17" XR-Adapt Barrel','17.3" Nero-Twin','17.4" Redwell-5K Barrel','18" Bowen Watchtower Barrel',
  '18" Ionic-8 Barrel','18" Jetstream Barrel','18" Rift-M7 Barrel','18" Sterling-G Barrel','18.5" Mach-78 Barrel',
  '18.7" Magellan Dual Barrel','19" Horizon Fluted Barrel','19" Revolution Barrel','19.3" Tack Driver Barrel','19.4" Stimulus Barrel',
  '19.8" Bull Barrel','20" Delta-F2 Barrel','20" Imperial Barrel','20" Ion Trinity Barrel','20" Titan Hybrid Barrel',
  '21" DF-3 Merge Barrel','21" Engage-R Barrel','21" Frontline Barrel','21" LTI Infinity Barrel','22" Impulse HB-762 Barrel',
  '23" Barrier Barrel','23" G-Force Barrel','23.5" Longbow Barrel','24.9" Domain Barrel','25" EAM Heavy Barrel',
  '4.1" Paragon Barrel','4.9" Omen Barrel','5" LTI Epsilon-1 Barrel','5.6" Banisher Barrel','6.3" Elevation Barrel',
  '6.3" Greaves Halberd Barrel','7.1" Hawker Ion Barrel','8" Warp-45 Barrel','8.7" EAM Voyager Barrel','9" Basilisk Barrel',
  '9" Heron Barrel','9.5" Synthesis Barrel','AK-27 Battle-Scar Conversion','Jäger 45 Grid-Breaker Kit','M8A1 AutoStrike-X8 Conversion',
  'MXR-17 ANVL Conversion','Velox 5.7 Carbine Chassis','X9 Maverick Javelin Assembly'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'underbarrel'), x
FROM unnest(ARRAY[
  'A.R.C. M1 Assault Frame','Advanced Step Handguard','Axis Shift Vertical Foregrip','AxisPro Handguard','Bowen Sentry Foregrip',
  'Breacher Handguard','DS20 Mirage Dual Fire Kit','EAM Lightpath Foregrip','EAM Steady-90 Grip','Enhance-32 Handstop',
  'Envoy Foregrip','Flowguard Foregrip','Fore Stabilizer Handstop','Fortify Handstop','Ironhold Angled Grip',
  'Kinetic Lock Handguard','LTI Enforcer Handguard','Lateral Precision Grip','M335-X','Neutralize-XR Handguard',
  'Parallel Foregrip','Quickstep Foregrip','Redwell Dash Handstop','Respire Handstop','Sentry Pro Handstop',
  'Stalwart-5 Handguard','Stetig-C Handguard','VAS Convergence Foregrip','XR-3 Ion Vulcan Minigun','Zero Shift Handstop',
  'Zero-S Handguard'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'magazine'), x
FROM unnest(ARRAY[
  'Belt-Fed','Bowen Bulwark Mag','Carbon 57 Fabricator Mag','Dual Mags','Fast Mag',
  'Forward Breach Mag','Goliath-X Extended+','Hellgate Stick Mag','MFS Airstrike Mag','Mammoth Stack Extended',
  'Payload Belt Extension','Snap Switch Magazines','Tri Bolt','VS-R Extended II','Vulcan Reach Extension'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'rear_grip'), x
FROM unnest(ARRAY[
  'Accordance Grip','Aria Assail Grip','Axel Control Grip','Bell-HB1 Grip','Bounty Grip',
  'Bowen Thrust Grip','Caravan-H2 Grip','Celerity Grip','Contour Grip','Contraband Grip',
  'Dash-L Grip','Delta Axis Grip','DiveEdge-7 Grip','EAM Dashfire Grip','EAM Ignition Grip',
  'EAM Pushback Grip','Eruption Grip','Excess Grip','Express Grip','Fissure Grip',
  'Fleet-G2 Grip','G7-Launch Grip','GL-3N Grip','Hades Looper-X Grip','Harbinger Grip',
  'Haste Ribbed Grip','Helix-Tac Grip','Herald-Z1 Grip','Hexcut Grip','Instinct Grip',
  'Intercept Grip','K&S Raze Grip','Kinesis Grip','Kinetix-Mk 1 Grip','L.T. Sling Grip',
  'L9 Vertigo Grip','LTI Precision Grip','Lennox Grip','Microdot Recovery Grip','Muse Grip',
  'Peregrine Grip','Phantom-17 Grip','Pincer Grip','QuikArm Grip','R-1 Shelf Grip',
  'R-2-Laúfen Grip','Ranger Lite Grip','Rapid-Lock Grip','ReadiFlex Grip','Rush-99 Grip',
  'ST3-Gloria Grip','Schmidt Trapper Grip','Skeletal Grip','Skeletonized Grip','Terra-1X Grip',
  'Trailblaze Grip','Transit-Ion Grip','Traverse Grip','VS Poise Grip','VX-Shift Grip',
  'Vantix-8 Grip','Vice Grip','Virgil-XI Grip','XR-Initialize Grip','XR-Omega Grip'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'stock'), x
FROM unnest(ARRAY[
  'Akita ScorchLink Akimbo','Bowen Defender Stock','Bowen Light Stock','Bowen Linchpin Stock','Charon Light Stock',
  'Coda 9 Adaptive Discharge Mod','Collapsible Stock','Converge Tactical Stock','Dual Wield','EAM Blitzfire Stock',
  'EAM Heritage Stock','EAM Stonewall Stock','Endurance LD-6 Stock','Exposed-73 Stock','Extraction Stock',
  'Gait-Lux Stock','Greaves Covenant Stock','Greaves Stalker Stock','Gridlock Stock','Intervention Stock',
  'K&S Impact Stock','LTI Collapsed Stock','LW Skeleton Stock','Lethal Absorb Stock','Lightshield Stock',
  'M10 Breacher Argus Lever','M10 Light Grip','M34 Novaline Garand Conversion','MK.78 Lightframe PDW Conversion','Padded Crush Stock',
  'R-54 Padded Stock','SF-7X Stock','SKE-02 Stock','Sctterproof Stock','Serval Q-Step Stock',
  'Shock Shield Stock','Skeletal Stock','Swift-B Guard Shock','SwiftGuard Stock','Swiftline Stock',
  'Telescopic Stock','Ultralight Tactical Stock','VAS Barrage-01 Stock','VAS Interlock Stock','VAS TH-09 Stock',
  'Vagrant-93 Stock','Ventral Stock','Wander-3V Stock','Winch Stock','XM325 Titan Wield'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'stock_pad'), x
FROM unnest(ARRAY[
  'Constrictor Pad','Contra Light Pad','Outpost Raider Pad','RWL Stability Pad','Renegade Pad',
  'RistRauch Breach Pad','Serpent Pad','Stabil Heavy Pad','Stronghold Stock Pad','Talos Pad'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'laser'), x
FROM unnest(ARRAY[
  '1mW Instinct Laser Array','1mW Pulse Laser','2mW Adaptive Tactical Laser','2mW Pinpoint Pistol Laser','3mW Motion Strike Laser',
  '4mW Snap Laser','5mW Lockstep Laser','Adaptive Tactical Laser','AirGlide Target Laser','Convergence Box Laser',
  'EAM Scatterline Laser','EMT3 Agile Laser','Jäger Rapid Zero-X Laser','Jäger Tactical Laser','K-Flash Target Laser',
  'LTI SwiftPoint Laser','MPC-25 ContraBloom Laser','Rapid Sight Motion Laser','Redwell Tactical Laser','Tactical Flex Laser',
  'VAS Precision Shift Laser','Vector Sync Laser'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'comb'), x
FROM unnest(ARRAY[
  'Aria Assail Comb','Bell-HB1 Comb','Celerity Comb','Fissure Comb','Shotgun',
  'Virgil-XI Comb','Warden 308 Badlands Pistol Kit'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'fire_mod'), x
FROM unnest(ARRAY[
  'Accelerated Recoil System','Bolt Carrier Group','Buffer Spring','Echo-12 Backlash Launcher','Light Bolt',
  'Pistol Recoil Spring','Pump Guide Rod','Quick Charge','Razor 9mm Wildfire Conversion','Recoil Sync Unit',
  'Ryden 45K Apex Sweeper Rig'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'ammunition'), x
FROM unnest(ARRAY['Extended Mags','High Capacity Magazines']) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
VALUES ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'bolt'), 'Explosive Tip')
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
VALUES ('blackops7', (SELECT id FROM attachment_types WHERE game_id = 'blackops7' AND slug = 'trigger_action'), 'Lightweight Trigger')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- BATTLEFIELD 6 (game_id = 'bf6')
-- ============================================================================

-- --- Weapon categories (existing: ar, carbine, dmr, lmg, sniper, smg) ---
INSERT INTO weapon_categories (game_id, name, slug, display_order) VALUES
  ('bf6', 'Shotgun', 'shotgun', 7),
  ('bf6', 'Sidearm', 'sidearm', 8)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Weapons ---
INSERT INTO weapons (id, game_id, category_id, name) VALUES
  -- Assault Rifle
  ('bf6-m433', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'M433'),
  ('bf6-b36a4', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'B36A4'),
  ('bf6-sor-556-mk2', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'SOR-556 Mk2'),
  ('bf6-ak4d', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'AK4D'),
  ('bf6-tr-7', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'TR-7'),
  ('bf6-kord-6p67', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'KORD 6P67'),
  ('bf6-nvo-228e', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'NVO-228E'),
  ('bf6-l85a3', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'L85A3'),
  ('bf6-vcr-2', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'VCR-2'),
  ('bf6-m16a4', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'M16A4'),
  ('bf6-ef88', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'ar'), 'EF88'),
  -- Carbine
  ('bf6-m4a1', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'M4A1'),
  ('bf6-m277', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'M277'),
  ('bf6-ak-205', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'AK-205'),
  ('bf6-m417-a2', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'M417 A2'),
  ('bf6-grt-bc', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'GRT-BC'),
  ('bf6-qbz-192', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'QBZ-192'),
  ('bf6-sg-553r', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'SG 553R'),
  ('bf6-sor-300sc', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'SOR-300SC'),
  ('bf6-brod-3', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'carbine'), 'BROD 3'),
  -- SMG
  ('bf6-sgx', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'SGX'),
  ('bf6-pw5a3', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'PW5A3'),
  ('bf6-pw7a2', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'PW7A2'),
  ('bf6-umg-40', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'UMG-40'),
  ('bf6-usg-90', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'USG-90'),
  ('bf6-kv9', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'KV9'),
  ('bf6-scw-10', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'SCW-10'),
  ('bf6-sl9', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'SL9'),
  ('bf6-cz3a1', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'CZ3A1'),
  ('bf6-pp-19', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'smg'), 'PP-19'),
  -- LMG
  ('bf6-l110', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'L110'),
  ('bf6-drs-iar', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'DRS-IAR'),
  ('bf6-m-60', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'M/60'),
  ('bf6-rpkm', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'RPKM'),
  ('bf6-m123k', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'M123K'),
  ('bf6-m250', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'M250'),
  ('bf6-kts100-mk8', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'KTS100 MK8'),
  ('bf6-m240l', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'M240L'),
  ('bf6-m121-a2', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'M121 A2'),
  ('bf6-rpk-74m', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'lmg'), 'RPK-74M'),
  -- DMR
  ('bf6-m39-emr', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'dmr'), 'M39 EMR'),
  ('bf6-lmr27', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'dmr'), 'LMR27'),
  ('bf6-svk-8-6', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'dmr'), 'SVK-8.6'),
  ('bf6-svdm', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'dmr'), 'SVDM'),
  ('bf6-grt-cps', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'dmr'), 'GRT-CPS'),
  ('bf6-vssm', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'dmr'), 'VSSM'),
  -- Sniper Rifle
  ('bf6-m2010-esr', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sniper'), 'M2010 ESR'),
  ('bf6-sv-98', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sniper'), 'SV-98'),
  ('bf6-psr', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sniper'), 'PSR'),
  ('bf6-mini-scout', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sniper'), 'Mini Scout'),
  ('bf6-l115', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sniper'), 'L115'),
  ('bf6-interdictor', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sniper'), 'Interdictor'),
  -- Shotgun
  ('bf6-m87a1', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'shotgun'), 'M87A1'),
  ('bf6-m1014', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'shotgun'), 'M1014'),
  ('bf6-18-5ks-k', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'shotgun'), '18.5KS-K'),
  ('bf6-db-12', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'shotgun'), 'DB-12'),
  -- Sidearm
  ('bf6-p18', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'P18'),
  ('bf6-es-5-7', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'ES 5.7'),
  ('bf6-m45a1', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'M45A1'),
  ('bf6-m44', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'M44'),
  ('bf6-ggh-22', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'GGH-22'),
  ('bf6-m357-trait', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'M357 Trait'),
  ('bf6-vz-61', 'bf6', (SELECT id FROM weapon_categories WHERE game_id = 'bf6' AND slug = 'sidearm'), 'vz. 61')
ON CONFLICT (id) DO NOTHING;

-- --- Attachment types (existing: sight, muzzle, barrel, underbarrel, magazine) ---
INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('bf6', 'Optic Accessory', 'optic_accessories', 6),
  ('bf6', 'Top Accessory', 'top_accessories', 7),
  ('bf6', 'Right Accessory', 'right_accessories', 8),
  ('bf6', 'Left Accessory', 'left_accessories', 9),
  ('bf6', 'Ergonomics', 'ergonomics', 10),
  ('bf6', 'Ammunition', 'ammunition', 11)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Attachments ---
-- NOTE: 'barrel' and 'magazine' intentionally omitted — see gaps note at top.
INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'sight'), x
FROM unnest(ARRAY[
  'Iron Sights','SU-123 1.50x','2PRO 1.25x','OSA-7 1.00x','1P87 1.50x','R-MR 1.00x','CCO 2.00x','SDO 3.50x',
  'CQ RDS 1.25x','Mini Flex 1.00x','3VZR 1.75x','Baker 3.00x','R4T 2.00x','DVO LPVO','RO-M 1.75x','ST Prism 5.00x',
  'ROX 1.50x','BF-2M 2.50x','Mars-F LPVO','PVQ-31 4.00x','RO-S 1.25x','MC-CO LPVO','LDS 4.50x','PAS-35 3.00x',
  'A-P2 1.75x','SF-G2 5.00x','Grim 1.50x','SU-230 LPVO','TH-RDS 1.00x',
  'S-VPS 6.00x','SSDS 6.00x','NGFC LPVO','NFX 8.00x','LERT 8.00x','R-VPS 10.00x','SM Rifle Variable','TS-HD 6.00x','1P88 Variable'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'optic_accessories'), x
FROM unnest(ARRAY[
  'Canted Iron Sights','Canted Reflex','Piggyback Reflex','Adjustable Magnification 2.00x',
  'Adjustable Magnification 3.00x','Adjustable Magnification 4.00x','Anti-Glare Coating'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'top_accessories'), x
FROM unnest(ARRAY['5 MW Green','5 MW Red','50 MW Green','50 MW Blue','120 MW Blue','50 MW Violet']) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'right_accessories'), x
FROM unnest(ARRAY['Flashlight','Taclight - Aimed','Taclight - Hip','Range Finder']) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'muzzle'), x
FROM unnest(ARRAY[
  'Flash Hider','Linear Comp','Single-Port Brake','Double-Port Brake','Compensated Brake',
  'Standard Suppressor','Long Suppressor','CQB Suppressor','Lightened Suppressor','Flash Comp'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'underbarrel'), x
FROM unnest(ARRAY[
  'Classic Vertical','Folding Vertical','Alloy Vertical','Ribbed Vertical','6H64 Vertical','Folding Stubby',
  'Ribbed Stubby','Canted Stubby','Full Angled','Stippled Stubby','Low-Profile Stubby','PTT Grip Pod',
  'Adjustable Angled','QD Grip Pod','Classic Grip Pod','Slim Angled','Slim Handstop','Bipod','Compact Handstop',
  'Laser Light Combo Red','Laser Light Combo Green'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'ergonomics'), x
FROM unnest(ARRAY['Magwell Flare','Match Trigger','Improved Mag Catch','DLC Bolt']) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'bf6', (SELECT id FROM attachment_types WHERE game_id = 'bf6' AND slug = 'ammunition'), x
FROM unnest(ARRAY[
  'FMJ','Tungsten Core','Hollow Point','Frangible','Polymer Case','Match Grade','Synthetic Tip',
  'Buckshot','Slugs','Flechette'
]) AS x
ON CONFLICT DO NOTHING;

-- ============================================================================
-- THE FINALS (game_id = 'thefinals')
-- ============================================================================

-- --- Weapon categories (mirrors existing `classes` slugs: light/medium/heavy) ---
INSERT INTO weapon_categories (game_id, name, slug, display_order) VALUES
  ('thefinals', 'Light', 'light', 1),
  ('thefinals', 'Medium', 'medium', 2),
  ('thefinals', 'Heavy', 'heavy', 3)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Weapons ---
INSERT INTO weapons (id, game_id, category_id, name) VALUES
  -- Light
  ('fin-93r', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), '93R'),
  ('fin-arn-220', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'ARN-220'),
  ('fin-dagger', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'Dagger'),
  ('fin-lh1', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'LH1'),
  ('fin-m11', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'M11'),
  ('fin-m26-matter', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'M26 Matter'),
  ('fin-recurve-bow', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'Recurve Bow'),
  ('fin-sh1900', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'SH1900'),
  ('fin-sr-84', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'SR-84'),
  ('fin-sword', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'Sword'),
  ('fin-throwing-knives', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'Throwing Knives'),
  ('fin-v9s', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'V9S'),
  ('fin-xp-54', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'light'), 'XP-54'),
  -- Medium
  ('fin-akm', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'AKM'),
  ('fin-cb-01-repeater', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'CB-01 Repeater'),
  ('fin-cerberus-12ga', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'Cerberus 12GA'),
  ('fin-chimera-xb', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'Chimera-XB'),
  ('fin-cl-40', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'CL-40'),
  ('fin-dual-blades', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'Dual Blades'),
  ('fin-famas', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'FAMAS'),
  ('fin-fcar', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'FCAR'),
  ('fin-model-1887', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'Model 1887'),
  ('fin-p90', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'P90'),
  ('fin-pike-556', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'Pike-556'),
  ('fin-r-357', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'R.357'),
  ('fin-riot-shield', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'medium'), 'Riot Shield'),
  -- Heavy
  ('fin-50-akimbo', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), '.50 Akimbo'),
  ('fin-bfr-titan', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'BFR Titan'),
  ('fin-flamethrower', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Flamethrower'),
  ('fin-ks-23', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'KS-23'),
  ('fin-lewis-gun', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Lewis Gun'),
  ('fin-m134-minigun', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'M134 Minigun'),
  ('fin-m60', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'M60'),
  ('fin-mgl32', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'MGL32'),
  ('fin-sa1216', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'SA1216'),
  ('fin-shak-50', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'ShAK-50'),
  ('fin-sledgehammer', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Sledgehammer'),
  ('fin-spear', 'thefinals', (SELECT id FROM weapon_categories WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Spear')
ON CONFLICT (id) DO NOTHING;

-- --- Specializations (existing `classes` table already has light/medium/heavy rows) ---
INSERT INTO specializations (game_id, class_id, name, type) VALUES
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'light'), 'Cloaking Device', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'light'), 'Evasive Dash', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'light'), 'Grappling Hook', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'medium'), 'Dematerializer', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'medium'), 'Guardian Turret', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'medium'), 'Healing Beam', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'medium'), 'Recon Senses', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'medium'), 'Shockwave', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Charge ''N'' Slam', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Goo Gun', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Mesh Shield', 'ability'),
  ('thefinals', (SELECT id FROM classes WHERE game_id = 'thefinals' AND slug = 'heavy'), 'Winch Claw', 'ability');

-- --- Gadgets (seeded into the generic `equipment` table; description notes class scope) ---
INSERT INTO equipment (game_id, name, description, display_order) VALUES
  -- Light-specific
  ('thefinals', 'Breach Charge', 'Light class gadget', 1),
  ('thefinals', 'Gateway', 'Light class gadget', 2),
  ('thefinals', 'Glitch Grenade', 'Light class gadget', 3),
  ('thefinals', 'Gravity Vortex', 'Light class gadget', 4),
  ('thefinals', 'H+ Infuser', 'Light class gadget', 5),
  ('thefinals', 'Nullifier', 'Light class gadget', 6),
  ('thefinals', 'Sonar Grenade', 'Light class gadget', 7),
  ('thefinals', 'Thermal Bore', 'Light class gadget', 8),
  ('thefinals', 'Thermal Vision', 'Light class gadget', 9),
  ('thefinals', 'Tracking Dart', 'Light class gadget', 10),
  ('thefinals', 'Vanishing Bomb', 'Light class gadget', 11),
  -- Medium-specific
  ('thefinals', 'APS Turret', 'Medium class gadget', 12),
  ('thefinals', 'Breach Drill', 'Medium class gadget', 13),
  ('thefinals', 'Data Reshaper', 'Medium class gadget', 14),
  ('thefinals', 'Defibrillator', 'Medium class gadget', 15),
  ('thefinals', 'Gas Mine', 'Medium class gadget', 16),
  ('thefinals', 'Glitch Trap', 'Medium class gadget', 17),
  ('thefinals', 'Hover Pad', 'Medium class gadget', 18),
  ('thefinals', 'Jump Pad', 'Medium class gadget', 19),
  ('thefinals', 'Zipline', 'Medium class gadget', 20),
  -- Heavy-specific
  ('thefinals', 'Anti-Gravity Cube', 'Heavy class gadget', 21),
  ('thefinals', 'Barricade', 'Heavy class gadget', 22),
  ('thefinals', 'C4', 'Heavy class gadget', 23),
  ('thefinals', 'Dome Shield', 'Heavy class gadget', 24),
  ('thefinals', 'Healing Emitter', 'Heavy class gadget', 25),
  ('thefinals', 'Lockbolt', 'Heavy class gadget', 26),
  ('thefinals', 'Pyro Mine', 'Heavy class gadget', 27),
  ('thefinals', 'RPG-7', 'Heavy class gadget', 28),
  -- Shared: Medium + Heavy
  ('thefinals', 'Explosive Mine', 'Shared gadget: Medium, Heavy', 29),
  ('thefinals', 'Proximity Sensor', 'Shared gadget: Medium, Heavy', 30),
  -- Shared: all classes
  ('thefinals', 'Flashbang', 'Shared gadget: Light, Medium, Heavy', 31),
  ('thefinals', 'Frag Grenade', 'Shared gadget: Light, Medium, Heavy', 32),
  ('thefinals', 'Gas Grenade', 'Shared gadget: Light, Medium, Heavy', 33),
  ('thefinals', 'Goo Grenade', 'Shared gadget: Light, Medium, Heavy', 34),
  ('thefinals', 'Pyro Grenade', 'Shared gadget: Light, Medium, Heavy', 35),
  ('thefinals', 'Smoke Grenade', 'Shared gadget: Light, Medium, Heavy', 36);

-- ============================================================================
-- WARZONE (game_id = 'warzone')
--
-- Research finding: Warzone has run on the Black Ops 7 arsenal as its
-- integrated premier title since Season 01 (Dec 2025), and is currently on
-- Season Five (Jul 2026) — so the current-season weapon/attachment roster is
-- identical to Black Ops 7's, just under game_id = 'warzone'. Older
-- weapons from prior title integrations (MW2019/Cold War/Vanguard/MW2/MW3/
-- BO6, ~200+ guns) also remain selectable as a "legacy" pool but are out of
-- scope here — this seeds the current-season arsenal that drives new-loadout
-- creation, matching what Black Ops 7 got above.
-- ============================================================================

-- --- Weapon categories (existing: ar, smg, marksman) ---
INSERT INTO weapon_categories (game_id, name, slug, display_order) VALUES
  ('warzone', 'LMG', 'lmg', 4),
  ('warzone', 'Sniper', 'sniper', 5),
  ('warzone', 'Shotgun', 'shotgun', 6),
  ('warzone', 'Handgun', 'handgun', 7),
  ('warzone', 'Launcher', 'launcher', 8),
  ('warzone', 'Melee', 'melee', 9),
  ('warzone', 'Special', 'special', 10)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Weapons ---
INSERT INTO weapons (id, game_id, category_id, name) VALUES
  -- Assault Rifle
  ('wz-ak-27', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'AK-27'),
  ('wz-an-94', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'AN-94'),
  ('wz-ds20-mirage', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'DS20 Mirage'),
  ('wz-egrt-17', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'EGRT-17'),
  ('wz-fg42', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'FG42'),
  ('wz-m15-mod-0', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'M15 Mod 0'),
  ('wz-maddox-rfb', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'Maddox RFB'),
  ('wz-mk35-isr', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'MK35 ISR'),
  ('wz-mxr-17', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'MXR-17'),
  ('wz-peacekeeper-mk1', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'Peacekeeper Mk1'),
  ('wz-voyak-kt-3', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'Voyak KT-3'),
  ('wz-vx-compact', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'VX Compact'),
  ('wz-x9-maverick', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'ar'), 'X9 Maverick'),
  -- SMG
  ('wz-carbon-57', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Carbon 57'),
  ('wz-cbrs-3', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'CBRS-3'),
  ('wz-dravec-45', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Dravec 45'),
  ('wz-gremlin', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Gremlin'),
  ('wz-kogot-7', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Kogot-7'),
  ('wz-mpc-25', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'MPC-25'),
  ('wz-razor-9mm', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Razor 9mm'),
  ('wz-rev-46', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'REV-46'),
  ('wz-rk-9', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'RK-9'),
  ('wz-ryden-45k', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Ryden 45K'),
  ('wz-sturmwolf-45', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'Sturmwolf 45'),
  ('wz-vst', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'smg'), 'VST'),
  -- LMG
  ('wz-mammoth', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'lmg'), 'Mammoth'),
  ('wz-mk-78', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'lmg'), 'MK.78'),
  ('wz-sokol-545', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'lmg'), 'Sokol 545'),
  ('wz-xm325', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'lmg'), 'XM325'),
  -- Marksman Rifle
  ('wz-krs-7-62', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'marksman'), 'KRS-7.62'),
  ('wz-m34-novaline', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'marksman'), 'M34 Novaline'),
  ('wz-m8a1', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'marksman'), 'M8A1'),
  ('wz-swordfish', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'marksman'), 'SwordFish'),
  ('wz-warden-308', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'marksman'), 'Warden 308'),
  -- Shotgun
  ('wz-akita', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'shotgun'), 'Akita'),
  ('wz-echo-12', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'shotgun'), 'Echo 12'),
  ('wz-m10-breacher', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'shotgun'), 'M10 Breacher'),
  ('wz-sg12', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'shotgun'), 'SG12'),
  -- Sniper Rifle
  ('wz-hawker-hx', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'sniper'), 'Hawker HX'),
  ('wz-shadow-sk', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'sniper'), 'Shadow SK'),
  ('wz-strider-300', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'sniper'), 'Strider 300'),
  ('wz-vs-recon', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'sniper'), 'VS Recon'),
  ('wz-xr-3-ion', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'sniper'), 'XR-3 Ion'),
  -- Handgun
  ('wz-coda-9', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'handgun'), 'CODA 9'),
  ('wz-jager-45', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'handgun'), 'Jäger 45'),
  ('wz-m1911', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'handgun'), 'M1911'),
  ('wz-velox-5-7', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'handgun'), 'Velox 5.7'),
  -- Launcher
  ('wz-arc-m1', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'launcher'), 'A.R.C. M1'),
  ('wz-aarow-109', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'launcher'), 'AAROW 109'),
  -- Melee
  ('wz-axe', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Axe'),
  ('wz-ballistic-knife', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Ballistic Knife'),
  ('wz-fists', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Fists'),
  ('wz-flatline-mk-ii', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Flatline Mk.II'),
  ('wz-h311-saw', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'H311-SAW'),
  ('wz-katana', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Katana'),
  ('wz-knife', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Knife'),
  ('wz-mace', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'melee'), 'Mace'),
  -- Special (NX Ravager is the in-game display name for the wiki's "Crossbow")
  ('wz-nx-ravager', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'special'), 'NX Ravager'),
  ('wz-gdl-havoc', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'special'), 'GDL Havoc'),
  ('wz-grimhawk', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'special'), 'Grimhawk'),
  ('wz-siren', 'warzone', (SELECT id FROM weapon_categories WHERE game_id = 'warzone' AND slug = 'special'), 'Siren')
ON CONFLICT (id) DO NOTHING;

-- --- Attachment types (existing: optic, muzzle, barrel, underbarrel, magazine) ---
INSERT INTO attachment_types (game_id, name, slug, display_order) VALUES
  ('warzone', 'Stock', 'stock', 6),
  ('warzone', 'Rear Grip', 'rear_grip', 7),
  ('warzone', 'Laser', 'laser', 8),
  ('warzone', 'Stock Pad', 'stock_pad', 9),
  ('warzone', 'Comb', 'comb', 10),
  ('warzone', 'Fire Mod', 'fire_mod', 11),
  ('warzone', 'Ammunition', 'ammunition', 12),
  ('warzone', 'Bolt', 'bolt', 13),
  ('warzone', 'Trigger Action', 'trigger_action', 14)
ON CONFLICT (game_id, slug) DO NOTHING;

-- --- Attachments (identical catalog to Black Ops 7 — same integrated title) ---
INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'optic'), x
FROM unnest(ARRAY[
  'Bowen Pixel Reflex','Bowen Scout Scope','Bowen X-25 IR','Circuit-Z Rangefinder','EAM Dual Zoom',
  'EAM Dyad xL','EAM IR-VIZ Reflex','EAM Micro Dot','EAM xL Reflex','EMT3 Holo Mk.2',
  'FANG HoverPoint ELO','Graves Ultra Zoom','Greaves AccuSpot 3x','K&S Slim Reflex','Kepler Prism-IX Mini',
  'Kepler T-Range Holo','Kepler Ultra 4x','LTI Mini','LTI Reflex','Lethal Tools ELO',
  'Millimeter Scanner','PrismaTech Digital Holo','PrismaTech Turbo 4x','Redwell 30-S 2x','RistRauch 7x',
  'Solaris Holo-IR','VAS Duo Hybrid Sight','VAS LED','VAS MicroFlex','VAS Strix 6x Thermal'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'muzzle'), x
FROM unnest(ARRAY[
  'Bowen Modulator 7.62','Breacher Precision Choke','Dual Dampener','Dual-Crown Echo Choke','Greaves A-762',
  'Greaves Ti-762','H-45 Precision Comp','H-9mm Precision Comp','Hawker Hybrid .45','Hawker Ported Comp',
  'Hawker Series 45','Hawker Stabilizer MK.II','Hawker-9 Brake','K&S Brake-2B','Kühn Ported Comp',
  'LTI Stentorian Brake','M10 CQB Choke','M10 Onyx Brake','Monolithic Suppressor','Ported-45 Brake',
  'R&S Stalker 57-X','RL-5.56 Brake','Redwell 7.62 Brake','Redwell Shade-X Suppressor','Triptych Brake',
  'VS-762 Brake'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'barrel'), x
FROM unnest(ARRAY[
  '10" Razor Impact Barrel','10.5" Greaves Whiptall Barrel','10.5" Slim-Mod Barrel','11" Racuh 6L-R Barrel','12" Cloud Barrel',
  '12" Vienna Barrel','13" RL-Genesys Barrel','14" Verse Barrel','14" Zephyr-R Barrel','14.5" E7-Cuff Barrel',
  '15" Ascend-KS Barrel','15" Fringe Barrel','15" Ghostline Barrel','15" Mirage Light Barrel','15" Skylance Barrel',
  '15" Wraith Barrel','15.5" Light Barrel','16" Reticulated Barrel','16.1" Proton Barrel','16.5" Deadeye Barrel',
  '16.5" Fusion Barrel','16.5" Predator Barrel','17" Bowen Moon Barrel','17" Greaves Scourge Barrel','17" Overload Barrel',
  '17" RistRauch Nimbus Barrel','17" XR-Adapt Barrel','17.3" Nero-Twin','17.4" Redwell-5K Barrel','18" Bowen Watchtower Barrel',
  '18" Ionic-8 Barrel','18" Jetstream Barrel','18" Rift-M7 Barrel','18" Sterling-G Barrel','18.5" Mach-78 Barrel',
  '18.7" Magellan Dual Barrel','19" Horizon Fluted Barrel','19" Revolution Barrel','19.3" Tack Driver Barrel','19.4" Stimulus Barrel',
  '19.8" Bull Barrel','20" Delta-F2 Barrel','20" Imperial Barrel','20" Ion Trinity Barrel','20" Titan Hybrid Barrel',
  '21" DF-3 Merge Barrel','21" Engage-R Barrel','21" Frontline Barrel','21" LTI Infinity Barrel','22" Impulse HB-762 Barrel',
  '23" Barrier Barrel','23" G-Force Barrel','23.5" Longbow Barrel','24.9" Domain Barrel','25" EAM Heavy Barrel',
  '4.1" Paragon Barrel','4.9" Omen Barrel','5" LTI Epsilon-1 Barrel','5.6" Banisher Barrel','6.3" Elevation Barrel',
  '6.3" Greaves Halberd Barrel','7.1" Hawker Ion Barrel','8" Warp-45 Barrel','8.7" EAM Voyager Barrel','9" Basilisk Barrel',
  '9" Heron Barrel','9.5" Synthesis Barrel','AK-27 Battle-Scar Conversion','Jäger 45 Grid-Breaker Kit','M8A1 AutoStrike-X8 Conversion',
  'MXR-17 ANVL Conversion','Velox 5.7 Carbine Chassis','X9 Maverick Javelin Assembly'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'underbarrel'), x
FROM unnest(ARRAY[
  'A.R.C. M1 Assault Frame','Advanced Step Handguard','Axis Shift Vertical Foregrip','AxisPro Handguard','Bowen Sentry Foregrip',
  'Breacher Handguard','DS20 Mirage Dual Fire Kit','EAM Lightpath Foregrip','EAM Steady-90 Grip','Enhance-32 Handstop',
  'Envoy Foregrip','Flowguard Foregrip','Fore Stabilizer Handstop','Fortify Handstop','Ironhold Angled Grip',
  'Kinetic Lock Handguard','LTI Enforcer Handguard','Lateral Precision Grip','M335-X','Neutralize-XR Handguard',
  'Parallel Foregrip','Quickstep Foregrip','Redwell Dash Handstop','Respire Handstop','Sentry Pro Handstop',
  'Stalwart-5 Handguard','Stetig-C Handguard','VAS Convergence Foregrip','XR-3 Ion Vulcan Minigun','Zero Shift Handstop',
  'Zero-S Handguard'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'magazine'), x
FROM unnest(ARRAY[
  'Belt-Fed','Bowen Bulwark Mag','Carbon 57 Fabricator Mag','Dual Mags','Fast Mag',
  'Forward Breach Mag','Goliath-X Extended+','Hellgate Stick Mag','MFS Airstrike Mag','Mammoth Stack Extended',
  'Payload Belt Extension','Snap Switch Magazines','Tri Bolt','VS-R Extended II','Vulcan Reach Extension'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'rear_grip'), x
FROM unnest(ARRAY[
  'Accordance Grip','Aria Assail Grip','Axel Control Grip','Bell-HB1 Grip','Bounty Grip',
  'Bowen Thrust Grip','Caravan-H2 Grip','Celerity Grip','Contour Grip','Contraband Grip',
  'Dash-L Grip','Delta Axis Grip','DiveEdge-7 Grip','EAM Dashfire Grip','EAM Ignition Grip',
  'EAM Pushback Grip','Eruption Grip','Excess Grip','Express Grip','Fissure Grip',
  'Fleet-G2 Grip','G7-Launch Grip','GL-3N Grip','Hades Looper-X Grip','Harbinger Grip',
  'Haste Ribbed Grip','Helix-Tac Grip','Herald-Z1 Grip','Hexcut Grip','Instinct Grip',
  'Intercept Grip','K&S Raze Grip','Kinesis Grip','Kinetix-Mk 1 Grip','L.T. Sling Grip',
  'L9 Vertigo Grip','LTI Precision Grip','Lennox Grip','Microdot Recovery Grip','Muse Grip',
  'Peregrine Grip','Phantom-17 Grip','Pincer Grip','QuikArm Grip','R-1 Shelf Grip',
  'R-2-Laúfen Grip','Ranger Lite Grip','Rapid-Lock Grip','ReadiFlex Grip','Rush-99 Grip',
  'ST3-Gloria Grip','Schmidt Trapper Grip','Skeletal Grip','Skeletonized Grip','Terra-1X Grip',
  'Trailblaze Grip','Transit-Ion Grip','Traverse Grip','VS Poise Grip','VX-Shift Grip',
  'Vantix-8 Grip','Vice Grip','Virgil-XI Grip','XR-Initialize Grip','XR-Omega Grip'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'stock'), x
FROM unnest(ARRAY[
  'Akita ScorchLink Akimbo','Bowen Defender Stock','Bowen Light Stock','Bowen Linchpin Stock','Charon Light Stock',
  'Coda 9 Adaptive Discharge Mod','Collapsible Stock','Converge Tactical Stock','Dual Wield','EAM Blitzfire Stock',
  'EAM Heritage Stock','EAM Stonewall Stock','Endurance LD-6 Stock','Exposed-73 Stock','Extraction Stock',
  'Gait-Lux Stock','Greaves Covenant Stock','Greaves Stalker Stock','Gridlock Stock','Intervention Stock',
  'K&S Impact Stock','LTI Collapsed Stock','LW Skeleton Stock','Lethal Absorb Stock','Lightshield Stock',
  'M10 Breacher Argus Lever','M10 Light Grip','M34 Novaline Garand Conversion','MK.78 Lightframe PDW Conversion','Padded Crush Stock',
  'R-54 Padded Stock','SF-7X Stock','SKE-02 Stock','Sctterproof Stock','Serval Q-Step Stock',
  'Shock Shield Stock','Skeletal Stock','Swift-B Guard Shock','SwiftGuard Stock','Swiftline Stock',
  'Telescopic Stock','Ultralight Tactical Stock','VAS Barrage-01 Stock','VAS Interlock Stock','VAS TH-09 Stock',
  'Vagrant-93 Stock','Ventral Stock','Wander-3V Stock','Winch Stock','XM325 Titan Wield'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'stock_pad'), x
FROM unnest(ARRAY[
  'Constrictor Pad','Contra Light Pad','Outpost Raider Pad','RWL Stability Pad','Renegade Pad',
  'RistRauch Breach Pad','Serpent Pad','Stabil Heavy Pad','Stronghold Stock Pad','Talos Pad'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'laser'), x
FROM unnest(ARRAY[
  '1mW Instinct Laser Array','1mW Pulse Laser','2mW Adaptive Tactical Laser','2mW Pinpoint Pistol Laser','3mW Motion Strike Laser',
  '4mW Snap Laser','5mW Lockstep Laser','Adaptive Tactical Laser','AirGlide Target Laser','Convergence Box Laser',
  'EAM Scatterline Laser','EMT3 Agile Laser','Jäger Rapid Zero-X Laser','Jäger Tactical Laser','K-Flash Target Laser',
  'LTI SwiftPoint Laser','MPC-25 ContraBloom Laser','Rapid Sight Motion Laser','Redwell Tactical Laser','Tactical Flex Laser',
  'VAS Precision Shift Laser','Vector Sync Laser'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'comb'), x
FROM unnest(ARRAY[
  'Aria Assail Comb','Bell-HB1 Comb','Celerity Comb','Fissure Comb','Shotgun',
  'Virgil-XI Comb','Warden 308 Badlands Pistol Kit'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'fire_mod'), x
FROM unnest(ARRAY[
  'Accelerated Recoil System','Bolt Carrier Group','Buffer Spring','Echo-12 Backlash Launcher','Light Bolt',
  'Pistol Recoil Spring','Pump Guide Rod','Quick Charge','Razor 9mm Wildfire Conversion','Recoil Sync Unit',
  'Ryden 45K Apex Sweeper Rig'
]) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
SELECT 'warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'ammunition'), x
FROM unnest(ARRAY['Extended Mags','High Capacity Magazines']) AS x
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
VALUES ('warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'bolt'), 'Explosive Tip')
ON CONFLICT DO NOTHING;

INSERT INTO attachments (game_id, attachment_type_id, name)
VALUES ('warzone', (SELECT id FROM attachment_types WHERE game_id = 'warzone' AND slug = 'trigger_action'), 'Lightweight Trigger')
ON CONFLICT DO NOTHING;
