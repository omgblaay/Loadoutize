alter table public.loadout_equipment
  add column is_any boolean not null default false;

-- Preserve any legacy slot-only rows as an explicit Any selection.
update public.loadout_equipment
set is_any = true
where equipment_id is null;

alter table public.loadout_equipment
  add constraint loadout_equipment_choice_check
  check (
    (is_any = true and equipment_id is null)
    or (is_any = false and equipment_id is not null)
  );
