-- Restore the MW4 playstyle options used by the creator and Explore filters.
-- No category rows means every weapon category may use these tags.
INSERT INTO public.tags (game_id, name, color, display_order)
VALUES
  ('mw4', 'Balanced', '#2563eb', 1),
  ('mw4', 'Long-range', '#22c55e', 2),
  ('mw4', 'Run ''n'' Gun', '#dc5a65', 3)
ON CONFLICT (game_id, name) DO NOTHING;
