export interface Key {
  value: string;
  label?: string;
  width?: number;
  /** Reserved for compatibility; rows determine key height. */
  height?: number;
  type?: "char" | "action" | string;
}
export type KeypadLayout = Key[][];
export interface Viewport {
  width: number;
  height: number;
  scale: number;
  offsetLeft: number;
  offsetTop: number;
}
