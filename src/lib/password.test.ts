import { describe, expect, it } from "vitest";

import {
  PASSWORD_MIN_LENGTH,
  getPasswordChecks,
  getPasswordStrength,
  isPasswordStrong,
} from "./password";

describe("password helpers", () => {
  it("requires the configured minimum length, a number, and a special character", () => {
    expect(getPasswordChecks("password")).toEqual([
      { label: `${PASSWORD_MIN_LENGTH}+ characters`, met: true },
      { label: "A number", met: false },
      { label: "A special character", met: false },
    ]);
  });

  it("treats the minimum length as inclusive", () => {
    expect(isPasswordStrong("abcde1!x")).toBe(true);
    expect(isPasswordStrong("abcd1!x")).toBe(false);
  });

  it.each([
    ["", "weak", 0],
    ["password", "weak", 1],
    ["password1", "fair", 2],
    ["pass123!", "strong", 3],
  ] as const)("classifies %j as %s", (password, strength, score) => {
    expect(getPasswordStrength(password)).toEqual({ strength, score });
  });
});
