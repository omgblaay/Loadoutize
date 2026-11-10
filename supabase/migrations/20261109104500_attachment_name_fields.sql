-- Keep editable attachment labels in real text columns for Directus.
ALTER TABLE public.attachments
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS subtype_label text;

UPDATE public.attachments
SET display_name = COALESCE(display_name, NULLIF(stats->>'displayName', ''), name),
    subtype_label = COALESCE(subtype_label, NULLIF(stats->>'subtypeLabel', ''))
WHERE display_name IS NULL OR (subtype_label IS NULL AND stats->>'subtypeLabel' IS NOT NULL);

UPDATE public.attachments
SET stats = COALESCE(stats, '{}'::jsonb) - 'displayName' - 'subtypeLabel'
WHERE stats ? 'displayName' OR stats ? 'subtypeLabel';

-- The deployed edge function still reads stats. Synthesize the two legacy
-- response keys in this view, while keeping the stored stats JSON clean.
CREATE OR REPLACE VIEW public.attachments_with_images AS
SELECT
  a.id,
  a.game_id,
  a.attachment_type_id,
  a.name,
  COALESCE(a.image, at.image) AS image,
  a.description,
  COALESCE(a.stats, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
    'displayName', a.display_name, 'subtypeLabel', a.subtype_label)) AS stats,
  a.created_at,
  at.name AS type_name,
  at.slug AS type_slug,
  at.image AS type_image,
  a.display_name,
  a.subtype_label
FROM public.attachments a
LEFT JOIN public.attachment_types at ON at.id = a.attachment_type_id;

DO $$
BEGIN
  IF to_regclass('public.directus_fields') IS NOT NULL THEN
    INSERT INTO public.directus_fields
      (collection, field, interface, hidden, readonly, width, note)
    SELECT 'attachments', v.field, 'input', false, false, v.width, v.note
    FROM (VALUES
      ('display_name', 'full', 'Attachment name shown in the app'),
      ('subtype_label', 'half', 'Optional attachment subtype')) AS v(field, width, note)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.directus_fields f
      WHERE f.collection = 'attachments' AND f.field = v.field
    );

    UPDATE public.directus_fields
    SET interface = 'input', hidden = false, readonly = false
    WHERE collection = 'attachments' AND field IN ('display_name', 'subtype_label');
  END IF;
END $$;
