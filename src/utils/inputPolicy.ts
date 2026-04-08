import qwerty from "../assets/qwerty.json";
import numberPad from "../assets/numberPad.json";
import phonePad from "../assets/phonePad.json";
import type { KeypadLayout } from "../hooks/useKeypadLayout";
import type { InputMode, InputPolicy } from "../types/inputPolicy";

const allowAll = () => true;

const presets: Record<InputMode, Required<Pick<InputPolicy, "mode">> & Partial<InputPolicy>> = {
  text: {
    mode: "text",
    layout: qwerty as KeypadLayout,
    filterKey: allowAll,
    sanitizeValue: (value) => value,
  },
  number: {
    mode: "number",
    layout: numberPad as KeypadLayout,
    filterKey: (key) => /^[0-9.]$/.test(key),
    sanitizeValue: (value) => value.replace(/[^0-9.]/g, ""),
  },
  tel: {
    mode: "tel",
    layout: phonePad as KeypadLayout,
    filterKey: (key) => /^[0-9*#+]$/.test(key),
    sanitizeValue: (value) => value.replace(/[^0-9*#+]/g, ""),
  },
  hangul: {
    mode: "hangul",
    layout: qwerty as KeypadLayout,
    filterKey: allowAll,
    sanitizeValue: (value) => value.replace(/[A-Za-z]/g, ""),
  },
  alpha: {
    mode: "alpha",
    layout: qwerty as KeypadLayout,
    filterKey: (key) => /^[A-Za-z]$/.test(key),
    sanitizeValue: (value) => value.replace(/[^A-Za-z]/g, ""),
  },
  alphanumeric: {
    mode: "alphanumeric",
    layout: qwerty as KeypadLayout,
    filterKey: (key) => /^[A-Za-z0-9]$/.test(key),
    sanitizeValue: (value) => value.replace(/[^A-Za-z0-9]/g, ""),
  },
  custom: {
    mode: "custom",
    layout: qwerty as KeypadLayout,
    filterKey: allowAll,
    sanitizeValue: (value) => value,
  },
};

export function resolveInputPolicy(policy?: Partial<InputPolicy>): Required<InputPolicy> {
  const mode = policy?.mode ?? "text";
  const preset = presets[mode];

  return {
    mode,
    layout: (policy?.layout ?? preset.layout ?? qwerty) as KeypadLayout,
    filterKey: policy?.filterKey ?? preset.filterKey ?? allowAll,
    sanitizeValue: policy?.sanitizeValue ?? preset.sanitizeValue ?? ((value) => value),
  };
}

export function isSpecialKey(key: string) {
  return ["Backspace", "Delete", "ArrowLeft", "ArrowRight", "HangulMode", "Shift", "Enter", "Tab"].includes(key);
}
