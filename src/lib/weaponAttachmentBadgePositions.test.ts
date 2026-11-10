import { describe, expect, it } from "vitest";
import { getOvalAttachmentBadgePosition } from "./weaponAttachmentBadgePositions";

describe("oval attachment badge positions", () => {
  it("uses the calibrated APEX position below the weapon", () => {
    const position = getOvalAttachmentBadgePosition("rex_ar_kilo2", "apex", undefined, 0, 1);
    expect(position.percent).toBe(77.5);
    expect(position.y).toBeGreaterThan(100);
  });

  it("keeps ammunition and magazine separate while resolving their aliases", () => {
    const ammo = getOvalAttachmentBadgePosition(undefined, "ammo", undefined, 0, 2);
    const ammunition = getOvalAttachmentBadgePosition(undefined, "ammunition", undefined, 0, 2);
    const mag = getOvalAttachmentBadgePosition(undefined, "mag", undefined, 1, 2);
    const magazine = getOvalAttachmentBadgePosition(undefined, "magazine", undefined, 1, 2);
    expect(ammo).toEqual(ammunition);
    expect(mag).toEqual(magazine);
    expect(ammo.percent).not.toBe(mag.percent);
  });
});
