ALTER TABLE tag_weapon_categories DROP CONSTRAINT tag_weapon_categories_pkey;
ALTER TABLE tag_weapon_categories ADD COLUMN id SERIAL PRIMARY KEY;
ALTER TABLE tag_weapon_categories ADD CONSTRAINT tag_weapon_categories_tag_category_unique UNIQUE (tag_id, weapon_category_id);
;
