import { describe, expect, it } from "vitest";
import { transformKey } from "./keyboard.js";
import { resolveInputPolicy } from "./inputPolicy.js";
import { parseKeyInput } from "./parseKeyInput.js";
describe("keyboard values", () => {
  it("keeps action labels out of input values", () => {
    expect(
      transformKey(
        { value: "Backspace", label: "⌫", type: "action" },
        true,
        false,
      ),
    ).toBe("Backspace");
    expect(
      transformKey({ value: " ", label: "␣", type: "action" }, true, false),
    ).toBe(" ");
    expect(
      transformKey({ value: "\n", label: "⏎", type: "action" }, true, false),
    ).toBe("Enter");
  });
  it("supports optional labels/types, macros and shifted Korean", () => {
    expect(transformKey({ value: "010", label: "휴대폰" }, true, false)).toBe(
      "010",
    );
    expect(transformKey({ value: "r" }, true, true)).toBe("ㄲ");
    expect(transformKey({ value: "o" }, true, true)).toBe("ㅒ");
    expect(resolveInputPolicy({ mode: "tel" }).filterKey("010")).toBe(true);
  });
  it.each(["F1", "F12", "Home", "End", "Dead", "AudioVolumeUp", "Process"])(
    "ignores %s",
    (key) => {
      expect(
        parseKeyInput(new KeyboardEvent("keydown", { key }), true),
      ).toEqual({ handled: false });
    },
  );
  it("uses the same Korean mode on every OS", () => {
    expect(
      parseKeyInput(new KeyboardEvent("keydown", { key: "r" }), true).text,
    ).toBe("ㄱ");
    expect(
      parseKeyInput(new KeyboardEvent("keydown", { key: "R" }), true).text,
    ).toBe("ㄲ");
  });
  it("sanitizes telephone paste and single-line text", () => {
    expect(
      resolveInputPolicy({ mode: "tel" }).sanitizeValue("+82 (010)-1234"),
    ).toBe("+820101234");
    expect(resolveInputPolicy().sanitizeValue("a\nb\tc")).toBe("a b c");
  });
});
