"""Replace selectable MW4 underbarrels with the user supplied table."""

import copy
import json
import re
from pathlib import Path


def normalized(value):
    return re.sub(r"[^a-z0-9]", "", value.casefold())


def apply_table(catalog, table_path):
    lines = Path(table_path).read_text().splitlines()
    if lines[0].split("\t") != ["display name", "sub label", "image", "for weapons"]:
        raise ValueError("Unexpected MW4 underbarrel table header")
    if len(lines) != 22:
        raise ValueError(f"Expected 21 underbarrel choices, found {len(lines) - 1}")

    weapons = {weapon["id"]: weapon for weapon in catalog["weapons"]}
    by_name = {normalized(weapon.get("display_name") or weapon["title"]): weapon["id"]
               for weapon in catalog["weapons"]}
    originals = {asset["id"]: copy.deepcopy(asset) for asset in catalog["assets"]}
    factory_ids = {asset_id for weapon in catalog["weapons"]
                   for slot, asset_id in weapon.get("factory_parts", {}).items()
                   if slot == "underbarrel"}
    removed = {asset["id"] for asset in catalog["assets"]
               if asset["slot"] == "underbarrel" and asset["id"] not in factory_ids}
    catalog["assets"] = [asset for asset in catalog["assets"] if asset["id"] not in removed]
    for weapon in catalog["weapons"]:
        weapon["assets"] = [asset_id for asset_id in weapon["assets"] if asset_id not in removed]
        weapon["shared_assets"] = [asset_id for asset_id in weapon.get("shared_assets", [])
                                   if asset_id not in removed]

    seen_images = set()
    choice_ids = set()
    for order, line in enumerate(lines[1:], 1):
        name, subtype, image_id, weapon_text = (value.strip() for value in line.split("\t"))
        original = originals.get(image_id)
        if not original or original["slot"] != "underbarrel" or not original.get("src"):
            raise ValueError(f"Unknown underbarrel image on row {order}: {image_id}")
        weapon_ids = []
        for label in weapon_text.split(","):
            weapon_id = by_name.get(normalized(label))
            if not weapon_id:
                raise ValueError(f"Unknown weapon on row {order}: {label}")
            if weapon_id not in weapon_ids:
                weapon_ids.append(weapon_id)
        choice_id = image_id if image_id not in seen_images else (
            f"{image_id}__{re.sub(r'[^a-z0-9]+', '_', name.casefold()).strip('_')}")
        if choice_id in choice_ids:
            raise ValueError(f"Duplicate underbarrel choice: {choice_id}")
        seen_images.add(image_id)
        choice_ids.add(choice_id)
        asset = copy.deepcopy(original)
        asset.update(id=choice_id, title=name, internal_title=name,
                     display_name=name.upper(), subtype_label=subtype.upper(),
                     image_asset_id=image_id, weapon_ids=weapon_ids,
                     underbarrel_order=order, underbarrel_table=True,
                     name_status="user_supplied", name_evidence="user_underbarrel_table")
        catalog["assets"].append(asset)
        for weapon_id in weapon_ids:
            weapons[weapon_id]["assets"].append(choice_id)
    return {"choices": len(choice_ids), "removed": len(removed), "factory": len(factory_ids)}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("table", type=Path)
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text())
    summary = apply_table(catalog, args.table)
    args.catalog.write_text(json.dumps(catalog, indent=2) + "\n")
    print(summary)
