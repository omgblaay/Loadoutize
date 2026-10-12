-- Existing published entries are single-weapon builds, so keep them intact
-- as weapon configs while introducing the richer full-loadout shape.
alter table public.loadouts
  add column content_type text not null default 'weapon_config';

alter table public.loadouts
  add constraint loadouts_content_type_check
  check (content_type in ('full_loadout', 'weapon_config'));

create index idx_loadouts_content_type
  on public.loadouts (game_id, content_type, created_at desc);

-- Weapon slot identity is explicit instead of being inferred from array order.
alter table public.loadout_weapons
  add column slot text;

update public.loadout_weapons
set slot = case slot_order
  when 1 then 'secondary'
  when 2 then 'melee'
  else 'primary'
end
where slot is null;

alter table public.loadout_weapons
  alter column slot set default 'primary',
  alter column slot set not null,
  add constraint loadout_weapons_slot_check
    check (slot in ('primary', 'secondary', 'melee')),
  add constraint loadout_weapons_loadout_slot_key
    unique (loadout_id, slot);

-- Catalog items carry their natural equipment slot, while the junction also
-- stores the selected slot so Postgres can enforce one choice per loadout.
alter table public.equipment
  add column slot text;

alter table public.equipment
  add constraint equipment_slot_check
  check (slot is null or slot in ('throwable', 'tactical', 'field_upgrade'));

update public.equipment
set slot = case
  when lower(name) in ('frag', 'frag grenade', 'semtex', 'molotov') then 'throwable'
  when lower(name) in ('flashbang', 'smoke grenade', 'stun grenade') then 'tactical'
  else slot
end
where slot is null;

create index idx_equipment_game_slot
  on public.equipment (game_id, slot, name);

alter table public.loadout_equipment
  add column slot text;

update public.loadout_equipment le
set slot = e.slot
from public.equipment e
where e.id = le.equipment_id and le.slot is null;

alter table public.loadout_equipment
  alter column slot set not null,
  add constraint loadout_equipment_slot_check
    check (slot in ('throwable', 'tactical', 'field_upgrade')),
  add constraint loadout_equipment_loadout_slot_key
    unique (loadout_id, slot);
