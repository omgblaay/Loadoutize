export interface SpritePreviewAttachment {
  typeSlug: string;
  label: string;
  assetId?: string;
}

export interface SpriteAsset {
  id: string;
  slot: string;
  src: string | null;
  families: string[];
  composable?: boolean;
  controller_only?: boolean;
  render_slot?: string;
  factory_component?: boolean;
  dependency_only?: boolean;
  receiver_variant?: string;
  default_parts?: Record<string, string>;
  dependencies?: Record<string, string>;
  locked_slots?: string[];
  slot_mounts?: Record<string, { source: string; u: number; v: number; dx?: number; dy?: number }>;
}

export interface SpriteWeapon {
  id: string;
  family: string;
  base_src: string;
  assets: string[];
  factory_parts?: Record<string, string>;
  component_base?: boolean;
  profile: {
    placements: Record<string, unknown>;
    asset_placements?: Record<string, unknown>;
  };
  [key: string]: unknown;
}

export interface SpriteLibrary {
  assets: SpriteAsset[];
  weapons: SpriteWeapon[];
  slots: string[];
  [key: string]: unknown;
}

const WEAPON_PREVIEW_REFS: Record<string, string> = {
  m4: "rex_ar_mike4",
  iso: "rex_sm_spier9",
};

const SLOT_ALIASES: Record<string, string> = {
  ammo: "ammunition",
  mag: "magazine",
  reargrip: "rear_grip",
  ironsights: "iron_sights",
};

const MUZZLE_SET_BY_FAMILY: Record<string, string> = {
  mike4: "a",
  akilo: "b",
  kilo2: "c",
  kilo437: "d",
  xar1: "i",
  uxray: "b",
  findia: "h",
  golf28: "h",
  recho: "c",
  tango73: "d",
  bmike3: "g",
  mpapa7: "f",
  pmike63: "i",
  psierra41: "i",
  spier9: "f",
  xsm1: "i",
  limax: "h",
};

export function getWeaponPreviewRef(weaponId?: string) {
  if (!weaponId) return null;
  if (weaponId.startsWith("rex_")) return weaponId;
  return WEAPON_PREVIEW_REFS[weaponId.toLowerCase()] ?? null;
}

export function normalizePreviewSlot(typeSlug: string) {
  const normalized = typeSlug.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return SLOT_ALIASES[normalized] ?? normalized;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function isSharedCompatible(weapon: SpriteWeapon, asset: SpriteAsset) {
  if (asset.families.length > 0) return false;
  const weaponType = weapon.id.split("_")[1];
  if (asset.slot === "muzzle") {
    const set = MUZZLE_SET_BY_FAMILY[weapon.family];
    return Boolean(set && asset.id.endsWith(`_${set}`));
  }
  if (asset.slot === "optic") {
    const common = /_((holo|reflex|minireddot)\d|holo_)/.test(asset.id);
    if (weaponType === "pi")
      return asset.id.includes("_pstl") || asset.id.includes("_piscope");
    if (weaponType === "sh") return common || asset.id.includes("_shscope");
    if (weaponType === "sm") return common;
    if (weaponType === "ar")
      return common || asset.id.includes("_arscope") || asset.id.includes("_fourx");
    if (weaponType === "br" || weaponType === "lm")
      return (
        common ||
        asset.id.includes("_arscope") ||
        asset.id.includes("_dmscope") ||
        asset.id.includes("_fourx")
      );
    if (weaponType === "dm")
      return (
        common ||
        asset.id.includes("_arscope") ||
        asset.id.includes("_dmscope") ||
        asset.id.includes("_fourx") ||
        asset.id.includes("_snscope")
      );
    if (weaponType === "sn")
      return (
        common ||
        asset.id.includes("_dmscope") ||
        asset.id.includes("_fourx") ||
        asset.id.includes("_snscope")
      );
    return false;
  }
  if (asset.slot === "underbarrel") {
    if (
      ["ar", "br", "dm", "lm", "sm", "sh"].includes(weaponType) &&
      /_(grip|gripside)_/.test(asset.id)
    )
      return true;
    if (
      ["ar", "br", "dm", "lm", "sn"].includes(weaponType) &&
      asset.id.includes("_bipod")
    )
      return true;
    return (
      ["ar", "br"].includes(weaponType) && /^rex_ub_(gl|sh)_std/.test(asset.id)
    );
  }
  if (asset.slot === "laser") {
    if (weaponType === "pi") return asset.id.includes("_pstl");
    if (weaponType === "sm") return asset.id.includes("_sml");
    if (["ar", "br", "dm", "lm", "sn"].includes(weaponType))
      return asset.id.includes("_lrg");
    return (
      weaponType === "sh" &&
      (asset.id.includes("_lrg") || asset.id.includes("_sml"))
    );
  }
  return false;
}

export function choosePreviewAsset(
  weapon: SpriteWeapon,
  assets: SpriteAsset[],
  attachment: SpritePreviewAttachment,
) {
  const slot = normalizePreviewSlot(attachment.typeSlug);
  const canPlace = (asset: SpriteAsset) => {
    const renderSlot = asset.render_slot ?? asset.slot;
    return Boolean(
      asset.composable &&
        (weapon.profile.asset_placements?.[asset.id] ||
          weapon.profile.placements[renderSlot]),
    );
  };
  if (attachment.assetId) {
    const exact = assets.find((asset) => asset.id === attachment.assetId && asset.slot === slot);
    return exact ?? null;
  }
  const inSlot = assets.filter(
    (asset) =>
      asset.slot === slot &&
      !asset.factory_component &&
      !asset.dependency_only &&
      canPlace(asset),
  );
  const familySpecific = inSlot.filter((asset) =>
    asset.families.includes(weapon.family),
  );
  const shared = inSlot.filter((asset) => isSharedCompatible(weapon, asset));
  const candidates = familySpecific.length > 0 ? familySpecific : shared;
  if (candidates.length === 0) return null;
  return candidates[stableHash(attachment.label) % candidates.length];
}

const RECEIVER_LINK_TOKENS = new Set([
  "545", "emp", "pdw", "gl", "airburst", "auto", "semi", "adversefire",
  "topload", "noads", "alt", "hyperburst", "fanfire", "hotload", "pump",
  "quickdraw", "incendiary", "knives", "akimbo", "ubsh", "lt",
]);

/** Match the weapon-builder's automatic conversion and receiver setup. */
export function createPreviewBuild(
  weapon: SpriteWeapon,
  assets: SpriteAsset[],
  attachments: SpritePreviewAttachment[],
) {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  const parts: Record<string, string> = {};
  const autoParts: Record<string, string> = {};
  for (const attachment of attachments) {
    const asset = choosePreviewAsset(weapon, assets, attachment);
    if (asset) parts[asset.slot] = asset.id;
  }
  if (weapon.family === "pmike63") {
    delete parts.guard;
    if (parts.barrel !== "rex_bar_hvy_pmike63") delete parts.underbarrel;
  }

  const conversion = byId.get(parts.apex);
  if (conversion) {
    for (const [slot, id] of Object.entries(conversion.default_parts ?? {})) {
      if (byId.has(id)) parts[slot] = id;
    }
    for (const slot of conversion.locked_slots ?? []) {
      delete parts[slot];
      autoParts[slot] = `apex:${conversion.id}`;
    }
    for (const [slot, id] of Object.entries(conversion.dependencies ?? {})) {
      if (byId.has(id)) {
        parts[slot] = id;
        autoParts[slot] = `apex:${conversion.id}`;
      }
    }
  }

  const receivers = assets.filter(
    (asset) => asset.slot === "receiver" && weapon.assets.includes(asset.id),
  );
  let receiver = receivers.find((asset) => asset.id === conversion?.receiver_variant);
  if (!receiver) {
    const selectedTokens = new Set(
      Object.entries(parts)
        .filter(([slot, id]) => slot !== "receiver" && byId.get(id)?.families.includes(weapon.family))
        .flatMap(([, id]) => id.split("_")),
    );
    let bestRank = 0;
    for (const candidate of receivers) {
      const variants = candidate.id.split("_").filter(
        (token) => !["rex", "rec", weapon.family].includes(token),
      );
      const linked = variants.filter((token) => RECEIVER_LINK_TOKENS.has(token) && selectedTokens.has(token)).length;
      const cosmetic = variants.filter((token) => !RECEIVER_LINK_TOKENS.has(token)).length;
      const rank = linked * 10 - cosmetic;
      if (linked && rank > bestRank) {
        bestRank = rank;
        receiver = candidate;
      }
    }
  }
  if (!receiver && weapon.family === "mpapa7" && parts.barrel) receiver = receivers.find((asset) => asset.id === "rex_rec_mpapa7");
  if (!receiver && weapon.family === "kilo2" && parts.barrel) receiver = receivers.find((asset) => asset.id === "rex_rec_airburst_kilo2_v04");
  const receiverId = receiver?.id ?? (weapon.component_base ? weapon.factory_parts?.receiver : undefined);
  if (receiverId) {
    parts.receiver = receiverId;
    autoParts.receiver = receiver
      ? receiver.id === "rex_rec_mpapa7" ? "factory_assembly" : "linked_attachment"
      : "factory_component";
  }

  return { parts, autoParts, transforms: {} };
}

export function resolveCatalogAssetUrls(
  library: SpriteLibrary,
  catalogUrl: string,
): SpriteLibrary {
  const baseUrl = new URL("./", new URL(catalogUrl, window.location.origin));
  return {
    ...library,
    assets: library.assets.map((asset) => ({
      ...asset,
      // APEX menu records can be icon-only with a null sprite source. Keep the
      // null so the compositor skips them instead of requesting ".../null".
      src: asset.src ? new URL(asset.src, baseUrl).toString() : null,
    })),
    weapons: library.weapons.map((weapon) => ({
      ...weapon,
      base_src: new URL(weapon.base_src, baseUrl).toString(),
    })),
  };
}
