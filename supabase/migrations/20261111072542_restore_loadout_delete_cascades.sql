-- The live foreign keys lost the delete action defined in the original schema.
-- Weapon slots and their attachments belong to a loadout, so both levels must
-- be removed when the parent loadout is deleted.
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'loadout_weapon_attachments_loadout_weapon_id_fkey'
      and conrelid = 'public.loadout_weapon_attachments'::regclass
      and confdeltype <> 'c'
  ) then
    alter table public.loadout_weapon_attachments
      drop constraint loadout_weapon_attachments_loadout_weapon_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'loadout_weapon_attachments_loadout_weapon_id_fkey'
      and conrelid = 'public.loadout_weapon_attachments'::regclass
  ) then
    alter table public.loadout_weapon_attachments
      add constraint loadout_weapon_attachments_loadout_weapon_id_fkey
      foreign key (loadout_weapon_id) references public.loadout_weapons(id)
      on delete cascade;
  end if;

  if exists (
    select 1 from pg_constraint
    where conname = 'loadout_weapons_loadout_id_fkey'
      and conrelid = 'public.loadout_weapons'::regclass
      and confdeltype <> 'c'
  ) then
    alter table public.loadout_weapons
      drop constraint loadout_weapons_loadout_id_fkey;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'loadout_weapons_loadout_id_fkey'
      and conrelid = 'public.loadout_weapons'::regclass
  ) then
    alter table public.loadout_weapons
      add constraint loadout_weapons_loadout_id_fkey
      foreign key (loadout_id) references public.loadouts(id)
      on delete cascade;
  end if;
end $$;
