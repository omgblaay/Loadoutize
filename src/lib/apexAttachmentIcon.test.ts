import { describe, expect, it } from "vitest";
import { apexAttachmentIconUrl } from "./apexAttachmentIcon";

describe("APEX attachment icon", () => {
  it("uses the current MW4 SVG when the attachment API omits its type image", () => {
    expect(apexAttachmentIconUrl(null, "mw4"))
      .toMatch(/\/35bfddeb-afd5-45ff-87f9-84c3775e2dd6\.svg$/);
    expect(apexAttachmentIconUrl("/replacement.svg", "mw4")).toBe("/replacement.svg");
  });
});
