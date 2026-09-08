import {
  clampBoundary,
  deleteText,
  insertText,
  type EditingState,
} from "./editing.js";

/** Apply only the browser's changed range, retaining untouched text and input policies. */
export function nativeEdit(
  previous: EditingState,
  value: string,
  selection: { start: number; end: number; backward: boolean },
  sanitize: (value: string) => string,
  filter: (value: string) => boolean,
  maxLength?: number,
): EditingState {
  if (value === previous.value) return previous;
  let start = 0;
  while (
    start < previous.value.length &&
    start < value.length &&
    previous.value[start] === value[start]
  )
    start++;
  start = Math.min(
    clampBoundary(previous.value, start),
    clampBoundary(value, start),
  );
  let oldEnd = previous.value.length,
    newEnd = value.length;
  while (
    oldEnd > start &&
    newEnd > start &&
    previous.value[oldEnd - 1] === value[newEnd - 1]
  ) {
    oldEnd--;
    newEnd--;
  }
  // A native edit may replace only a combining mark. Include its complete grapheme.
  while (
    clampBoundary(previous.value, oldEnd) !== oldEnd ||
    clampBoundary(value, newEnd) !== newEnd
  ) {
    if (oldEnd < previous.value.length) oldEnd++;
    if (newEnd < value.length) newEnd++;
  }
  const raw = value.slice(start, newEnd);
  const inserted = sanitize(raw).replace(/[\r\n\t]+/g, " ");
  if (raw && (!inserted || !filter(inserted))) return previous;
  const range = { ...previous, anchor: start, caret: oldEnd, composing: false };
  const next = raw
    ? insertText(range, inserted, false, maxLength)
    : deleteText(range, -1);
  if (next === range) return previous;
  const offset = (position: number) =>
    clampBoundary(
      next.value,
      position <= start
        ? position
        : position >= newEnd
          ? position + inserted.length - raw.length
          : start +
            sanitize(raw.slice(0, position - start)).replace(/[\r\n\t]+/g, " ")
              .length,
    );
  return {
    ...next,
    anchor: offset(selection.backward ? selection.end : selection.start),
    caret: offset(selection.backward ? selection.start : selection.end),
  };
}
