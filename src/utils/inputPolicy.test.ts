import { describe, expect, it } from "vitest";
import { getForcedHangulMode } from "./inputPolicy";

describe("getForcedHangulMode", () => {
  it("forces english-friendly modes out of hangul", () => {
    expect(getForcedHangulMode("alpha")).toBe(false);
    expect(getForcedHangulMode("alphanumeric")).toBe(false);
    expect(getForcedHangulMode("number")).toBe(false);
    expect(getForcedHangulMode("tel")).toBe(false);
  });

  it("forces hangul mode for hangul-only inputs", () => {
    expect(getForcedHangulMode("hangul")).toBe(true);
  });

  it("leaves flexible modes unchanged", () => {
    expect(getForcedHangulMode("text")).toBeNull();
    expect(getForcedHangulMode("custom")).toBeNull();
  });
});
