import type { KeypadLayout } from "../hooks/useKeypadLayout";

export type InputMode =
  | "text"
  | "number"
  | "tel"
  | "hangul"
  | "alpha"
  | "alphanumeric"
  | "custom";

export type InputPolicy = {
  mode: InputMode;
  layout?: KeypadLayout;
  filterKey?: (key: string) => boolean;
  sanitizeValue?: (value: string) => string;
};
