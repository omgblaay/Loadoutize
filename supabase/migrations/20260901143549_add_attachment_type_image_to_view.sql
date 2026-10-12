CREATE OR REPLACE VIEW attachments_with_images AS
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
  at.slug as type_slug,
  at.image as type_image
FROM attachments a
LEFT JOIN attachment_types at ON a.attachment_type_id = at.id;;
