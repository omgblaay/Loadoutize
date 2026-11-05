import { describe, expect, it } from "vitest";

import {
  attachmentGroupMetaPath,
  attachmentMetaListPath,
  attachmentMetaPath,
  explorePath,
  gamePath,
  loadoutPath,
  perkMetaListPath,
  weaponMetaListPath,
  weaponMetaPath,
} from "./routes";

describe("route builders", () => {
  it("builds Explore URLs and omits empty values", () => {
    expect(explorePath("mw4", { search: "m4", page: 2, featured: false, empty: "", missing: null })).toBe(
      "/explore?search=m4&page=2&featured=false",
    );
  });

  it("does not expose the locked game in the Explore query", () => {
    expect(explorePath("warzone")).toBe("/explore");
  });

  it("encodes dynamic meta path segments", () => {
    expect(weaponMetaPath("mw4", "M4 / Custom")).toBe("/meta/weapons/M4%20%2F%20Custom");
    expect(attachmentMetaPath("mw4", "optic/red dot")).toBe("/meta/attachments/optic%2Fred%20dot");
    expect(attachmentGroupMetaPath("mw4", "Rear Grip")).toBe("/meta/attachmentgroup/Rear%20Grip");
  });

  it("builds list paths", () => {
    expect(gamePath("mw4", "meta")).toBe("/meta");
    expect(weaponMetaListPath("mw4")).toBe("/meta/weapons");
    expect(weaponMetaListPath("mw4", "Assault Rifles")).toBe("/meta/weapons?category=Assault%20Rifles");
    expect(attachmentMetaListPath("mw4")).toBe("/meta/attachments");
    expect(perkMetaListPath("mw4")).toBe("/meta/perks");
  });

  it("selects the loadout path from the content type", () => {
    expect(loadoutPath("mw4", "123")).toBe("/cfg/123");
    expect(loadoutPath("mw4", "123", "weapon_config")).toBe("/cfg/123");
    expect(loadoutPath("mw4", "123", "full_loadout")).toBe("/l/123");
  });
});
