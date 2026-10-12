WITH expanded AS (
  SELECT
    l.id AS loadout_id,
    l.game_id,
    (ord - 1) AS slot_order,
    w->>'id' AS weapon_id,
    COALESCE(w->'attachments', '{}'::jsonb) AS attachments_obj
  FROM loadouts l,
       jsonb_array_elements(l.weapons) WITH ORDINALITY AS t(w, ord)
),
inserted_weapons AS (
  INSERT INTO loadout_weapons (loadout_id, weapon_id, slot_order)
  SELECT e.loadout_id, e.weapon_id, e.slot_order
  FROM expanded e
  JOIN weapons wp ON wp.id = e.weapon_id
  RETURNING id, loadout_id, weapon_id, slot_order
),
attachment_pairs AS (
  SELECT
    iw.id AS loadout_weapon_id,
    e.game_id,
    kv.key AS type_name,
    kv.value AS attachment_name
  FROM expanded e
  JOIN inserted_weapons iw
    ON iw.loadout_id = e.loadout_id AND iw.weapon_id = e.weapon_id AND iw.slot_order = e.slot_order
  CROSS JOIN LATERAL jsonb_each_text(e.attachments_obj) AS kv(key, value)
)
INSERT INTO loadout_weapon_attachments (loadout_weapon_id, attachment_id)
SELECT DISTINCT ap.loadout_weapon_id, a.id
FROM attachment_pairs ap
JOIN attachment_types at ON at.name = ap.type_name AND at.game_id = ap.game_id
JOIN attachments a ON a.attachment_type_id = at.id AND a.name = ap.attachment_name
ON CONFLICT (loadout_weapon_id, attachment_id) DO NOTHING;
;
