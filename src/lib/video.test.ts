import { describe, expect, it } from "vitest";

import { detectVideoPlatform } from "./video";

describe("detectVideoPlatform", () => {
  it.each([
    ["https://www.tiktok.com/@player/video/123", "tiktok"],
    ["https://m.tiktok.com/v/123", "tiktok"],
    ["https://instagram.com/reel/abc", "instagram"],
    ["https://www.instagram.com/p/abc", "instagram"],
    ["https://youtube.com/watch?v=abc", "youtube"],
    ["https://music.youtube.com/watch?v=abc", "youtube"],
    ["https://youtu.be/abc", "youtube"],
  ] as const)("recognizes %s", (url, platform) => {
    expect(detectVideoPlatform(url)).toBe(platform);
  });

  it.each([
    "not a url",
    "https://example.com/video",
    "https://fakeyoutube.com/watch?v=abc",
    "https://youtube.com.example.com/watch?v=abc",
  ])("rejects unsupported or invalid URL %s", (url) => {
    expect(detectVideoPlatform(url)).toBeNull();
  });
});
