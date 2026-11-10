-- Keep the MW4 creator and Explore tag options current.
UPDATE public.tags
SET color = '#43a047'
WHERE game_id = 'mw4'
  AND name = 'Balanced';

INSERT INTO public.tags (game_id, name, color, display_order)
VALUES ('mw4', 'Quick Score', '#f2a900', 4)
ON CONFLICT (game_id, name) DO NOTHING;
