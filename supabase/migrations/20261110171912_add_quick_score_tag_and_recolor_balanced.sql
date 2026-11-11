-- Keep the MW4 creator and Explore tag options current.
UPDATE public.tags
SET color = '#2563eb'
WHERE game_id = 'mw4'
  AND name = 'Balanced';

UPDATE public.tags
SET color = '#22c55e'
WHERE game_id = 'mw4'
  AND name = 'Long-range';

UPDATE public.tags
SET name = 'Quick Scope', color = '#f97316'
WHERE game_id = 'mw4'
  AND name = 'Quick Score';

INSERT INTO public.tags (game_id, name, color, display_order)
VALUES ('mw4', 'Quick Scope', '#f97316', 4)
ON CONFLICT (game_id, name) DO UPDATE SET color = EXCLUDED.color;
