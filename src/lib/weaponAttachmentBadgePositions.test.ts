import { describe, expect, it } from "vitest";
import { getOvalAttachmentBadgePosition } from "./weaponAttachmentBadgePositions";

describe("oval attachment badge positions", () => {
  it("puts APEX at 75 percent, centered below the weapon", () => {
    const position = getOvalAttachmentBadgePosition("rex_ar_kilo2", "apex", undefined, 0, 1);
    expect(position.percent).toBe(75);
    expect(position.x).toBeCloseTo(50);
    expect(position.y).toBeGreaterThan(100);
  });

  it("keeps aliases and other slots on the same oval", () => {
    const ammo = getOvalAttachmentBadgePosition(undefined, "ammo", undefined, 0, 2);
    const magazine = getOvalAttachmentBadgePosition(undefined, "magazine", undefined, 1, 2);
    expect(ammo).toEqual(magazine);
  });
});
