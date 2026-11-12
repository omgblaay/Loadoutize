import { describe, expect, it } from "vitest";
import { findAttachmentForWeapon } from "./attachmentLookup";

describe("weapon attachment lookup", () => {
  it("resolves shared internal APEX names by weapon", () => {
    const attachments = [
      { type: "APEX", name: "APEX conversion", displayName: "ODEN SENTINEL", stats: { weaponIds: ["rex_br_asierra12"] } },
      { type: "APEX", name: "APEX conversion", displayName: "CRONEN MAELSTROM", stats: { weaponIds: ["rex_br_ngsierra"] } },
    ];
    expect(findAttachmentForWeapon(attachments, "APEX", "APEX conversion", "rex_br_ngsierra")?.displayName)
      .toBe("CRONEN MAELSTROM");
    expect(findAttachmentForWeapon(attachments, "APEX", "APEX conversion", "rex_br_asierra12")?.displayName)
      .toBe("ODEN SENTINEL");
    expect(findAttachmentForWeapon(attachments, "APEX", "APEX conversion", "rex_ar_mike4"))
      .toBeUndefined();
  });
});
