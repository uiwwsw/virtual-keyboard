import { describe, expect, it } from "vitest";
import {
  deleteText,
  insertText,
  moveCaret,
  wordRangeAt,
  type EditingState,
} from "./editing.js";
const state = (
  value = "",
  caret = value.length,
  anchor = caret,
): EditingState => ({ value, caret, anchor, composing: false });
describe("text editing", () => {
  it.each([
    ["hello world", 8, [6, 11]],
    ["hello world", 11, [6, 11]],
    ["안녕 세상", 1, [0, 2]],
    ["A👨‍👩‍👧‍👦B", 4, [1, 12]],
    ["e\u0301!", 1, [0, 2]],
    ["", 0, [0, 0]],
  ] as const)(
    "selects a complete word or grapheme at %s[%i]",
    (value, index, range) => {
      expect(wordRangeAt(value, index)).toEqual(range);
    },
  );
  it("composes Hangul across syllables and deletes one composing jamo", () => {
    let result = state();
    for (const char of ["ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅡ", "ㄹ"])
      result = insertText(result, char, true);
    expect(result.value).toBe("한글");
    expect(deleteText(result, -1).value).toBe("한그");
    expect(deleteText({ ...result, composing: false }, -1).value).toBe("한");
  });
  it("moves a final consonant into the next syllable", () => {
    let result = state();
    for (const char of ["ㄱ", "ㅏ", "ㄴ", "ㅏ"])
      result = insertText(result, char, true);
    expect(result.value).toBe("가나");
  });
  it("does not compose with a previous syllable after cursor movement", () => {
    const result = insertText(
      moveCaret({ ...state("가"), composing: true }, "end"),
      "ㄴ",
      true,
    );
    expect(result.value).toBe("가ㄴ");
  });
  it("replaces reverse selections and collapses to the correct edge", () => {
    expect(insertText(state("abcdef", 1, 5), "X").value).toBe("aXf");
    expect(moveCaret(state("abcdef", 1, 5), -1).caret).toBe(1);
    expect(moveCaret(state("abcdef", 1, 5), 1).caret).toBe(5);
  });
  it.each(["😀", "👨‍👩‍👧‍👦", "e\u0301", "🇰🇷"])(
    "treats %s as a single grapheme",
    (text) => {
      const result = state("A" + text + "B", 1 + text.length);
      expect(deleteText(result, -1).value).toBe("AB");
      expect(moveCaret(result, -1).caret).toBe(1);
      expect(deleteText(state(result.value, 1), 1).value).toBe("AB");
    },
  );
  it("rejects overflow without truncating the suffix or splitting emoji", () => {
    const initial = state("1234", 2);
    expect(insertText(initial, "😀", false, 5)).toEqual(initial);
    expect(insertText(state("1234", 1, 3), "X", false, 4).value).toBe("1X4");
  });
});
