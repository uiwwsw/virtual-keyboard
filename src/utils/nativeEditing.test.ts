import { describe, expect, it } from "vitest";
import { nativeEdit } from "./nativeEditing.js";
import type { EditingState } from "./editing.js";

const state = (value: string): EditingState => ({
  value,
  anchor: value.length,
  caret: value.length,
  composing: false,
});
const identity = (text: string) => text;
const allow = () => true;
const caret = (start: number) => ({ start, end: start, backward: false });

describe("native browser edits", () => {
  it.each([
    ["hello world", "hello friend", 12],
    ["hello world", "hellworld", 4],
    ["한글", "한국어", 3],
    ["e\u0301x", "e\u0300x", 2],
    ["👩🏽‍💻!", "👩🏻‍💻!", 7],
    ["a🇰🇷b", "ab", 1],
  ])(
    "reconciles %s → %s without splitting graphemes",
    (before, after, position) => {
      expect(
        nativeEdit(state(before), after, caret(position), identity, allow),
      ).toEqual({
        value: after,
        anchor: position,
        caret: position,
        composing: false,
      });
    },
  );
  it("sanitizes only the changed range and maps a backward selection", () => {
    const next = nativeEdit(
      state("prefix:12"),
      "prefix:1x342",
      { start: 8, end: 10, backward: true },
      (text) => text.replace(/\D/g, ""),
      allow,
    );
    expect(next).toEqual({
      value: "prefix:1342",
      anchor: 9,
      caret: 8,
      composing: false,
    });
  });
  it("rejects an invalid or overflowing edit without deleting selected text", () => {
    const before = { ...state("123"), anchor: 1, caret: 2 };
    expect(nativeEdit(before, "1x3", caret(2), identity, () => false)).toBe(
      before,
    );
    expect(nativeEdit(before, "1x3", caret(2), () => "", allow)).toBe(before);
    expect(nativeEdit(before, "1453", caret(3), identity, allow, 3)).toBe(
      before,
    );
  });
});
