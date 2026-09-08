import { convertQwertyToHangul } from "es-hangul";
import { isHangul } from "./isHangul.js";

/** Interpret physical keys consistently across platforms. Mac IME may already supply Hangul. */
export function parseKeyInput(
  e: React.KeyboardEvent | KeyboardEvent,
  hangulMode: boolean,
): {
  handled: boolean;
  toggleHangulMode?: boolean;
  text?: string;
  composing?: boolean;
} {
  if (e.key === "HangulMode") return { handled: true, toggleHangulMode: true };
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    [...e.key].length !== 1 ||
    /[\r\n\t]/.test(e.key)
  ) {
    return { handled: false };
  }
  const text =
    hangulMode && /^[A-Za-z]$/.test(e.key)
      ? convertQwertyToHangul(e.key)
      : e.key;
  return { handled: true, text, composing: isHangul(text) };
}
