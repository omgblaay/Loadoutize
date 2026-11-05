import { describe, expect, it } from "vitest";
import { orderedAttachmentEntries } from "./attachmentOrder";

describe("orderedAttachmentEntries", () => {
  it("orders loadout attachments by their displayed slot order", () => {
    const attachments = {
      underbarrel: "underbarrel",
      trigger: "trigger",
      apex: "apex",
      magazine: "magazine",
      rear_grip: "rear grip",
      comb: "comb",
      stock: "stock",
      optic: "optic",
      laser: "laser",
      barrel: "barrel",
      muzzle: "muzzle",
    };

    expect(orderedAttachmentEntries(attachments).map(([slot]) => slot)).toEqual([
      "muzzle", "barrel", "laser", "optic", "stock", "comb",
      "rear_grip", "magazine", "apex", "trigger", "underbarrel",
    ]);
  });

  it("puts unknown slots after known slots and supports alternate labels", () => {
    expect(orderedAttachmentEntries({ other: 1, tigger: 2, "Rear Grip": 3, laserlight: 4 }).map(([slot]) => slot))
      .toEqual(["laserlight", "Rear Grip", "tigger", "other"]);
  });
});
