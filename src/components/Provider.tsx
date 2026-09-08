import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useId,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { VirtualKeypad } from "./Keypad.js";
import { useStorage } from "../hooks/useStorage.js";
import { VirtualInputContext, type InputEditingStatus } from "./Context.js";
import type { VirtualInputHandle } from "./Input.js";
import qwerty from "../assets/qwerty.json";
import selectionLayout from "../assets/selectionModeLayout.json";
import {
  getForcedHangulMode,
  resolveInputPolicy,
} from "../utils/inputPolicy.js";
import type { InputPolicy } from "../types/inputPolicy.js";
import type { KeypadLayout } from "../types/keyboard.js";
import { useVisualViewport } from "../hooks/useVisualViewport.js";
import { useSystemTheme } from "../hooks/useSystemTheme.js";
import { isMobileAgent } from "../utils/isMobileAgent.js";

const GLOBAL_FOCUS_EVENT = "virtual-keyboard:focus-change";
export interface VirtualInputProviderProps {
  children: ReactNode;
  layout?: KeypadLayout;
  defaultHangulMode?: boolean;
  theme?: "light" | "dark";
  /** auto: touch/mobile devices; always: also show on desktop; never: physical keys only. */
  keyboardVisibility?: "auto" | "always" | "never";
}
export function VirtualInputProvider({
  children,
  layout = qwerty,
  defaultHangulMode = true,
  theme,
  keyboardVisibility = "auto",
}: VirtualInputProviderProps) {
  const providerId = useId();
  const inputRef = useRef<VirtualInputHandle | null>(null);
  const focusedElement = useRef<HTMLElement | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [focusId, setFocusId] = useState<string>();
  const [shiftState, setShiftState] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectionAdjusting, setSelectionAdjusting] = useState(false);
  const [editingStatus, setEditingStatus] = useState<InputEditingStatus>({
    selectionLength: 0,
    hasValue: false,
    message: "",
  });
  const [preferredHangul, setPreferredHangul] = useStorage(
    "virtual-keyboard-hangul-mode",
    defaultHangulMode,
  );
  const [activeInputPolicy, setActiveInputPolicy] = useState(() =>
    resolveInputPolicy({ layout }),
  );
  const [mobile, setMobile] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const viewport = useVisualViewport();
  const systemTheme = useSystemTheme();
  const hangulMode =
    getForcedHangulMode(activeInputPolicy.mode) ?? preferredHangul;
  const visible =
    !!focusId &&
    (keyboardVisibility === "always" ||
      (keyboardVisibility === "auto" && mobile));
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    const update = () => setMobile(isMobileAgent());
    update();
    const query = window.matchMedia?.("(pointer: coarse)");
    query?.addEventListener("change", update);
    return () => query?.removeEventListener("change", update);
  }, []);

  const clearFocus = useCallback(() => {
    clearTimeout(blurTimer.current);
    focusedElement.current = null;
    inputRef.current = null;
    setFocusId(undefined);
    setShiftState(0);
    setSelectionMode(false);
    setSelectionAdjusting(false);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== providerId) clearFocus();
    };
    window.addEventListener(GLOBAL_FOCUS_EVENT, handler);
    return () => {
      window.removeEventListener(GLOBAL_FOCUS_EVENT, handler);
      clearTimeout(blurTimer.current);
    };
  }, [providerId, clearFocus]);

  const onFocus = useCallback(
    (id: string, target: HTMLElement, policy: InputPolicy) => {
      clearTimeout(blurTimer.current);
      if (focusedElement.current !== target) {
        setShiftState(0);
        setSelectionMode(false);
        setSelectionAdjusting(false);
      }
      focusedElement.current = target;
      setActiveInputPolicy(resolveInputPolicy(policy));
      setFocusId(id);
      window.dispatchEvent(
        new CustomEvent(GLOBAL_FOCUS_EVENT, { detail: providerId }),
      );
    },
    [providerId],
  );

  const onBlur = useCallback(
    (event?: React.FocusEvent | boolean) => {
      if (event === true) {
        clearFocus();
        return;
      }
      const target =
        typeof event === "object"
          ? (event.relatedTarget as HTMLElement | null)
          : null;
      if (target?.closest?.("[data-virtual-input], [data-virtual-keypad]"))
        return;
      // Mobile pan/cancel gestures can blur to no element. The keypad's
      // outside-tap handler owns dismissal; moving focus to a control still closes.
      if (!target && visibleRef.current) return;
      clearTimeout(blurTimer.current);
      blurTimer.current = setTimeout(clearFocus, 0);
    },
    [clearFocus],
  );

  useEffect(() => {
    if (!visible || !keyboardHeight || viewport.scale !== 1) return;
    const frame = requestAnimationFrame(() => {
      const rect = focusedElement.current?.getBoundingClientRect();
      if (!rect) return;
      const bottom = viewport.offsetTop + viewport.height - keyboardHeight - 16;
      if (rect.bottom > bottom)
        // Do not inherit a host page's smooth scrolling while a touch is active.
        window.scrollBy({ top: rect.bottom - bottom, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [
    focusId,
    visible,
    keyboardHeight,
    viewport.height,
    viewport.offsetTop,
    viewport.scale,
  ]);

  const toggleKorean = useCallback(() => {
    if (getForcedHangulMode(activeInputPolicy.mode) === null)
      setPreferredHangul((previous) => !previous);
  }, [activeInputPolicy.mode, setPreferredHangul]);
  const toggleShift = useCallback(
    () => setShiftState((state) => (state + 1) % 3),
    [],
  );
  const consumeShift = useCallback(
    () => setShiftState((state) => (state === 1 ? 0 : state)),
    [],
  );
  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
    setSelectionAdjusting(false);
  }, []);
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectionAdjusting(false);
  }, []);
  const toggleSelectionAdjust = useCallback(
    () => setSelectionAdjusting((state) => !state),
    [],
  );

  return (
    <VirtualInputContext.Provider
      value={{
        inputRef,
        focusId,
        onFocus,
        onBlur,
        defaultLayout: layout,
        hangulMode,
        shift: shiftState > 0,
        shiftLocked: shiftState === 2,
        theme: theme ?? systemTheme,
        toggleKorean,
        toggleShift,
        consumeShift,
        selectionMode,
        selectionAdjusting,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelectionAdjust,
        activeInputPolicy,
        editingStatus,
        setEditingStatus,
      }}
    >
      {children}
      {visible && (
        <>
          {createPortal(
            <div
              aria-hidden="true"
              style={{
                height: keyboardHeight,
                pointerEvents: "none",
                background:
                  (theme ?? systemTheme) === "dark" ? "#121c17" : "#f7f8f4",
              }}
            />,
            document.body,
          )}
          <VirtualKeypad
            key={focusId}
            layout={selectionMode ? selectionLayout : activeInputPolicy.layout}
            viewport={viewport}
            onHeightChange={setKeyboardHeight}
          />
        </>
      )}
    </VirtualInputContext.Provider>
  );
}
