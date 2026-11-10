// Mirrors the compatibility rules in the source weapon-builder/app.js.
const han86ExtraOptics = new Set([
  "rex_arscope_airburst", "rex_arscope_hybrid01_le", "rex_arscope_vz01_zoom2",
  "rex_fourx_hybcant01_le", "rex_fourx_therm01_sp", "rex_fourx_therm02",
  "rex_holo02_jugg",
]);
function sharedCompatible(weapon, asset, library) {
  if (asset.families.length) return false;
  const type = weapon.id.split("_")[1];
  const id = asset.id;
  if (asset.slot === "ammunition") return weapon.shared_assets?.includes(id) || false;
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
  if (asset.slot === "laser") {
    if (type === "pi") return id.includes("_pstl");
    if (type === "sm") return id.includes("_sml");
    if (["ar", "br", "dm", "lm", "sn"].includes(type)) return id.includes("_lrg");
    return type === "sh" && (id.includes("_lrg") || id.includes("_sml"));
  }
  return false;
}

export function builderWeaponIds(asset, library) {
  if (asset.slot === "muzzle") return asset.muzzle_table ? asset.weapon_ids ?? [] : [];
  if (asset.slot === "underbarrel") return asset.underbarrel_table
    ? asset.weapon_ids ?? []
    : library.weapons.filter((weapon) => weapon.factory_parts?.underbarrel === asset.id).map((weapon) => weapon.id);
  if (["iron_sights", "other"].includes(asset.slot)) return [];
  // These assets reuse the same large-weapon laser icon as the canonical entry.
  // They are texture aliases, not extra selectable choices in the game menu.
  if (["rex_laserir_lrg", "rex_laserhip_lrg03_dim_sp", "rex_laserhip_lrg03_sp"].includes(asset.id)) return [];
  if ([asset.id, asset.title, asset.display_name, asset.internal_title].some((name) => /broken/i.test(name || ""))) return [];
  if (asset.dependency_only || asset.slot === "receiver") return [];
  return library.weapons
    .filter((weapon) => weapon.group !== "Melee / equipment" && !weapon.id.startsWith("rex_me_"))
    .filter((weapon) => {
      if (weapon.id === "rex_ar_kilo2" && asset.slot === "optic" && han86ExtraOptics.has(asset.id)) return false;
      if (weapon.id === "rex_ar_kilo2" && ["rex_stock_ass_kilo2_sp", "rex_pgrip_kilo2_gl"].includes(asset.id)) return false;
      if (weapon.family === "sierra100" && asset.slot === "magazine" && !Object.values(weapon.factory_parts || {}).includes(asset.id)) return false;
      if (Object.values(weapon.factory_parts || {}).includes(asset.id)) return false;
      return weapon.assets.includes(asset.id) || sharedCompatible(weapon, asset, library);
    })
    .map((weapon) => weapon.id);
}
