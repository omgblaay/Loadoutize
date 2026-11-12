export interface WeaponScopedAttachment {
  name: string;
  type?: string | null;
  weaponIds?: string[] | null;
  stats?: { weaponIds?: string[] | null } | null;
}

export function preferWeaponAttachment<T extends WeaponScopedAttachment>(
  matches: T[],
  weaponId?: string,
): T | undefined {
  if (!weaponId) return matches[0];
  return matches.find((attachment) =>
    (attachment.weaponIds ?? attachment.stats?.weaponIds)?.includes(weaponId)) ??
    matches.find((attachment) => !(attachment.weaponIds ?? attachment.stats?.weaponIds)?.length);
}

/** Saved loadouts store a type and internal name, which may be shared by several weapons. */
export function findAttachmentForWeapon<T extends WeaponScopedAttachment>(
  attachments: T[],
  type: string,
  name: string,
  weaponId?: string,
): T | undefined {
  const matches = attachments.filter((attachment) =>
    attachment.type === type && attachment.name === name);
  return preferWeaponAttachment(matches, weaponId);
}
