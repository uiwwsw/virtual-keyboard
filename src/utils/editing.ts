import { assemble, removeLastCharacter } from "es-hangul";
import { isHangul } from "./isHangul.js";

export interface EditingState {
  value: string;
  caret: number;
  anchor: number;
  composing: boolean;
}

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const wordSegmenter = new Intl.Segmenter(undefined, { granularity: "word" });
export function wordRangeAt(value: string, index: number): [number, number] {
  const position = Math.max(0, Math.min(index, value.length - 1));
  for (const part of wordSegmenter.segment(value)) {
    if (position < part.index + part.segment.length)
      return [part.index, part.index + part.segment.length];
  }
  return [0, 0];
}
export const graphemes = (value: string) =>
  Array.from(segmenter.segment(value));
export function clampBoundary(value: string, index: number) {
  const boundaries = [
    ...graphemes(value).map((part) => part.index),
    value.length,
  ];
  return (
    boundaries.filter((boundary) => boundary <= Math.max(0, index)).at(-1) ?? 0
  );
}
export function moveBoundary(value: string, index: number, direction: -1 | 1) {
  const boundaries = [
    ...graphemes(value).map((part) => part.index),
    value.length,
  ];
  return direction < 0
    ? (boundaries.filter((boundary) => boundary < index).at(-1) ?? 0)
    : (boundaries.find((boundary) => boundary > index) ?? value.length);
}
export const selectionRange = ({ anchor, caret }: EditingState) =>
  [Math.min(anchor, caret), Math.max(anchor, caret)] as const;

export function insertText(
  state: EditingState,
  text: string,
  composing = false,
  maxLength?: number,
): EditingState {
  const [start, end] = selectionRange(state);
  let before = state.value.slice(0, start);
  let inserted = text;
  if (
    start === end &&
    state.composing &&
    composing &&
    isHangul(before.at(-1) ?? "")
  ) {
    inserted = assemble([before.at(-1)!, text]);
    before = before.slice(0, -1);
  }
  const value = before + inserted + state.value.slice(end);
  // Reject an overflowing edit instead of silently deleting the existing suffix.
  if (maxLength !== undefined && value.length > maxLength) return state;
  const caret = before.length + inserted.length;
  return { value, caret, anchor: caret, composing };
}

export function deleteText(
  state: EditingState,
  direction: -1 | 1,
): EditingState {
  let [start, end] = selectionRange(state);
  if (start === end) {
    if (
      direction < 0 &&
      state.composing &&
      isHangul(state.value[start - 1] ?? "")
    ) {
      const before =
        state.value.slice(0, start - 1) +
        removeLastCharacter(state.value[start - 1]);
      return {
        value: before + state.value.slice(end),
        anchor: before.length,
        caret: before.length,
        composing: true,
      };
    }
    if (direction < 0) start = moveBoundary(state.value, start, -1);
    else end = moveBoundary(state.value, end, 1);
  }
  return {
    value: state.value.slice(0, start) + state.value.slice(end),
    caret: start,
    anchor: start,
    composing: false,
  };
}

export function moveCaret(
  state: EditingState,
  direction: -1 | 1 | "home" | "end",
  extend = false,
): EditingState {
  const [start, end] = selectionRange(state);
  const caret =
    direction === "home"
      ? 0
      : direction === "end"
        ? state.value.length
        : !extend && start !== end
          ? direction < 0
            ? start
            : end
          : moveBoundary(state.value, state.caret, direction);
  return {
    ...state,
    caret,
    anchor: extend ? state.anchor : caret,
    composing: false,
  };
}
