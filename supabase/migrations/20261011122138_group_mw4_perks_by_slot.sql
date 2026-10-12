alter table public.perks
  add column if not exists slot text;

alter table public.perks
  add constraint perks_slot_check
  check (slot is null or slot in ('perk_1', 'perk_2', 'perk_3'));

-- Match the in-game MW4 perk rows and their left-to-right order exactly.
update public.perks
set
  slot = mapping.slot,
  display_order = mapping.display_order
from (
  values
    ('QUICK FIX', 'perk_1', 1),
    ('OVERKILL', 'perk_1', 2),
    ('HIGH ALERT', 'perk_1', 3),
    ('NINJA', 'perk_1', 4),
    ('GHOST', 'perk_1', 5),
    ('KILL CHAIN', 'perk_1', 6),
    ('HARDLINE', 'perk_2', 1),
    ('BOMB SQUAD', 'perk_2', 2),
    ('FAST HANDS', 'perk_2', 3),
    ('BIRDSEYE', 'perk_2', 4),
    ('TRACKER', 'perk_2', 5),
    ('RESUPPLY', 'perk_2', 6),
    ('BLOOD RUSH', 'perk_3', 1),
    ('SCAVENGER', 'perk_3', 2),
    ('LETHAL REACH', 'perk_3', 3),
    ('BATTLE HARDENED', 'perk_3', 4),
    ('COLD-BLOODED', 'perk_3', 5),
    ('COMBAT GRID', 'perk_3', 6)
) as mapping(name, slot, display_order)
where perks.game_id = 'mw4'
  and upper(perks.name) = mapping.name;

create index idx_perks_game_slot_order
  on public.perks (game_id, slot, display_order, name);
