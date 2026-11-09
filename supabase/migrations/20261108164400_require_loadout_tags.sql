-- Existing CODMunity versatile builds use the Balanced playstyle tag.
UPDATE public.loadouts AS loadout
SET tag_id = tag.id
FROM public.tags AS tag
WHERE loadout.game_id = 'mw4'
  AND tag.game_id = loadout.game_id
  AND tag.name = 'Balanced'
  AND loadout.game_loadout_code IN (
    'S03-43QCD-D4EP7-KU11',
    'A09-43QCD-D4HTW-VI11',
    'A02-43QCD-CXJDX-MS11',
    'S06-3YNQ7-YB11',
    'A01-43QCD-CXBJ5-XS11'
  );

UPDATE public.loadouts AS loadout
SET tag_id = tag.id
FROM public.tags AS tag
WHERE loadout.game_id = 'mw4'
  AND tag.game_id = loadout.game_id
  AND tag.name = 'Long-range'
  AND loadout.game_loadout_code = 'R04-2G9Q4-VHSZY-11';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.loadouts WHERE tag_id IS NULL) THEN
    RAISE EXCEPTION 'Assign a tag to every loadout before requiring tag_id';
  END IF;
END $$;

ALTER TABLE public.loadouts ALTER COLUMN tag_id SET NOT NULL;
ALTER TABLE public.loadouts DROP CONSTRAINT loadouts_tag_id_fkey;
ALTER TABLE public.loadouts
  ADD CONSTRAINT loadouts_tag_id_fkey
  FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE RESTRICT;
