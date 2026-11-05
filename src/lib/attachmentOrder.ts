const SLOT_ORDER = [
  ["muzzle"],
  ["barrel"],
  ["laser", "laserlight"],
  ["optic", "optics"],
  ["stock"],
  ["comb"],
  ["reargrip", "grip"],
  ["magazine", "mag"],
  ["apex"],
  ["trigger", "tigger"],
  ["underbarrel"],
] as const;

function normalizedSlot(slot: string) {
  return slot.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function compareAttachmentSlots(a: string, b: string) {
  const rank = (slot: string) => {
    const normalized = normalizedSlot(slot);
    const index = SLOT_ORDER.findIndex((aliases) =>
      aliases.some((alias) => alias === normalized),
    );
    return index < 0 ? SLOT_ORDER.length : index;
  };
  return rank(a) - rank(b) || a.localeCompare(b);
}

export function orderedAttachmentEntries<T>(attachments: Record<string, T> | null | undefined) {
  return Object.entries(attachments ?? {}).sort(([a], [b]) => compareAttachmentSlots(a, b));
}
