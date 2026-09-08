import { convertQwertyToHangul } from "es-hangul";
import type { Key } from "../types/keyboard.js";

/** Labels are presentation only; an omitted type denotes a character/macro. */
export function transformKey(key: Key, hangul: boolean, shift: boolean) {
  if (key.type === "action") return key.value === "\n" ? "Enter" : key.value;
  if (!/^[a-zA-Z]$/.test(key.value)) return key.value;
  const value = shift ? key.value.toUpperCase() : key.value;
  return hangul ? convertQwertyToHangul(value) : value;
}
