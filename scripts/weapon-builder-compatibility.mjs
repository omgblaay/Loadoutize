// Mirrors the compatibility rules in the source weapon-builder/app.js.
const sniperUnderbarrels = new Set([
  "rex_grip_ang", "rex_grip_ang_short", "rex_grip_vert",
  "rex_grip_vert_short", "rex_grip_bipod01",
]);
const muzzleSetByFamily = {
  mike4: "a", akilo: "b", kilo2: "c", kilo437: "d", xar1: "i",
  uxray: "b", findia: "h", golf28: "h", recho: "c", tango73: "d",
  bmike3: "g", mpapa7: "f", pmike63: "f", psierra41: "i",
  spier9: "f", xsm1: "i", limax: "h",
};
const muzzleIdsByFamily = {
  ngsierra: new Set(["rex_comp_vert_c", "rex_comp_bal_c", "rex_sil_tac_c", "rex_sil_hvy_c", "rex_breach_c", "rex_flash_c"]),
  kilo5: new Set(["rex_comp_bal_e", "rex_comp_hoz_e", "rex_flash_e", "rex_sil_lgt_e"]),
};

function sharedCompatible(weapon, asset, library) {
  if (asset.families.length) return false;
  const type = weapon.id.split("_")[1];
  const id = asset.id;
  if (asset.slot === "muzzle") {
    if (id.includes("_broken")) return false;
    const ids = muzzleIdsByFamily[weapon.family];
    if (ids) return ids.has(id);
    const set = muzzleSetByFamily[weapon.family];
    return Boolean(set && id.endsWith(`_${set}`));
  }
  if (asset.slot === "optic") {
    const common = /_((holo|reflex|minireddot)\d|holo_)/.test(id) && !id.includes("_pstl");
    if (type === "pi") return id.includes("_pstl") || id.includes("_piscope");
    if (type === "sh") return common || id.includes("_shscope");
    if (type === "sm") return common;
    if (type === "ar") return common || id.includes("_arscope") || id.includes("_fourx");
    if (type === "br" || type === "lm") return common || id.includes("_arscope") || id.includes("_dmscope") || id.includes("_fourx");
    if (type === "dm") return common || id.includes("_arscope") || id.includes("_dmscope") || id.includes("_fourx") || id.includes("_snscope");
    if (type === "sn") return common || id.includes("_dmscope") || id.includes("_fourx") || id.includes("_snscope");
    return false;
  }
  if (asset.slot === "underbarrel") {
    if (weapon.family === "sierra100") return false;
    if (type === "sn") {
      if (sniperUnderbarrels.has(id)) return true;
      const hasOwnBipod = library.assets.some((item) => weapon.assets.includes(item.id) && item.slot === "underbarrel" && item.id.startsWith("rex_bipod_"));
      return id === "rex_bipod01" && !hasOwnBipod;
    }
    if (["ar", "br", "dm", "lm", "sm", "sh"].includes(type) && /_(grip|gripside)_/.test(id)) return true;
    if (["ar", "br", "dm", "lm", "sn"].includes(type) && id.includes("_bipod")) return true;
    return ["ar", "br"].includes(type) && /^rex_ub_(gl|sh)_std/.test(id);
  }
  if (asset.slot === "laser") {
    if (type === "pi") return id.includes("_pstl");
    if (type === "sm") return id.includes("_sml");
    if (["ar", "br", "dm", "lm", "sn"].includes(type)) return id.includes("_lrg");
    return type === "sh" && (id.includes("_lrg") || id.includes("_sml"));
  }
  return false;
}

export function builderWeaponIds(asset, library) {
  if ([asset.id, asset.title, asset.display_name, asset.internal_title].some((name) => /broken/i.test(name || ""))) return [];
  if (asset.dependency_only || asset.slot === "receiver") return [];
  return library.weapons
    .filter((weapon) => weapon.group !== "Melee / equipment" && !weapon.id.startsWith("rex_me_"))
    .filter((weapon) => {
      if (weapon.family === "sierra100" && (asset.slot === "underbarrel" || (asset.slot === "magazine" && !Object.values(weapon.factory_parts || {}).includes(asset.id)))) return false;
      if (Object.values(weapon.factory_parts || {}).includes(asset.id)) return false;
      return weapon.assets.includes(asset.id) || sharedCompatible(weapon, asset, library);
    })
    .map((weapon) => weapon.id);
}
