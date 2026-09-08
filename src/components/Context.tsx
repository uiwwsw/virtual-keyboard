import { createContext, useContext, type RefObject } from "react";
import type { VirtualInputHandle } from "./Input.js";
import type { InputPolicy } from "../types/inputPolicy.js";
import type { KeypadLayout } from "../types/keyboard.js";

interface VirtualInputContextValue {
  inputRef: RefObject<VirtualInputHandle | null>;
  onFocus: (id: string, target: HTMLElement, policy: InputPolicy) => void;
  onBlur: (event?: React.FocusEvent | boolean) => void;
  focusId: string | undefined;
  defaultLayout: KeypadLayout;
  hangulMode: boolean;
  shift: boolean;
  shiftLocked: boolean;
  theme: "light" | "dark";
  toggleShift: () => void;
  consumeShift: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  selectionMode: boolean;
  selectionAdjusting: boolean;
  toggleSelectionAdjust: () => void;
  toggleKorean: () => void;
  activeInputPolicy: Required<InputPolicy>;
}
export const VirtualInputContext =
  createContext<VirtualInputContextValue | null>(null);
export function useVirtualInputContext() {
  const context = useContext(VirtualInputContext);
  if (!context)
    throw new Error(
      "VirtualInput must be used within a <VirtualInputProvider>.",
    );
  return context;
}
