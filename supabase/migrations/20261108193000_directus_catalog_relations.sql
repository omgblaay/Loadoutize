-- Replace legacy JSON pointers with normal foreign keys for Directus selectors.
ALTER TABLE public.weapon_categories
  ADD COLUMN IF NOT EXISTS game_id text;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'weapon_categories' AND column_name = 'game') THEN
    UPDATE public.weapon_categories SET game_id = game->>'key'
    WHERE game_id IS NULL AND game->>'key' IS NOT NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weapon_categories_game_id_fkey'
    AND conrelid = 'public.weapon_categories'::regclass) THEN
    ALTER TABLE public.weapon_categories ADD CONSTRAINT weapon_categories_game_id_fkey
      FOREIGN KEY (game_id) REFERENCES public.games(id) ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.weapons
  ADD COLUMN IF NOT EXISTS weapon_category_id integer;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'weapons' AND column_name = 'weapon_category') THEN
    UPDATE public.weapons SET weapon_category_id = (weapon_category->>'key')::integer
    WHERE weapon_category_id IS NULL AND weapon_category->>'key' IS NOT NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
    AND table_name = 'weapons' AND column_name = 'category_id') THEN
    UPDATE public.weapons SET weapon_category_id = category_id
    WHERE weapon_category_id IS NULL AND category_id IS NOT NULL;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'weapons_weapon_category_id_fkey'
    AND conrelid = 'public.weapons'::regclass) THEN
    ALTER TABLE public.weapons ADD CONSTRAINT weapons_weapon_category_id_fkey
      FOREIGN KEY (weapon_category_id) REFERENCES public.weapon_categories(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_weapon_categories_game_id ON public.weapon_categories(game_id);
CREATE INDEX IF NOT EXISTS idx_weapons_weapon_category_id ON public.weapons(weapon_category_id);

-- Historical image paths map to existing Directus files by unique filename.
DO $$ BEGIN
  IF to_regclass('public.directus_files') IS NOT NULL THEN
    UPDATE public.attachments a SET image = f.id
    FROM public.directus_files f
    WHERE a.image IS NULL AND a.stats->>'imagePath' IS NOT NULL
      AND f.filename_download = split_part(a.stats->>'imagePath', '/',
        array_length(string_to_array(a.stats->>'imagePath', '/'), 1));
    -- Preserve paths that do not resolve to an actual Directus file.
    UPDATE public.attachments a SET stats = a.stats - 'imagePath'
    WHERE a.stats->>'imagePath' IS NOT NULL AND a.image IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.directus_files f WHERE f.id = a.image);
  END IF;
END $$;
-- Null placeholders contain no recoverable image path.
UPDATE public.attachments SET stats = stats - 'imagePath'
WHERE stats->'imagePath' = 'null'::jsonb;
