import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  forwardRef,
  useImperativeHandle,
  type HTMLAttributes,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ClipboardEvent,
  type PointerEvent,
} from "react";
import { EditHistory } from "../utils/history.js";
import { useVirtualInputContext } from "./Context.js";
import { parseKeyInput } from "../utils/parseKeyInput.js";
import {
  getForcedHangulMode,
  resolveInputPolicy,
} from "../utils/inputPolicy.js";
import {
  clampBoundary,
  deleteText,
  graphemes,
  insertText,
  moveCaret as move,
  selectionRange,
  wordRangeAt,
  type EditingState,
} from "../utils/editing.js";
import type { InputMode } from "../types/inputPolicy.js";
import type { KeypadLayout } from "../types/keyboard.js";

export interface VirtualInputHandle {
  focus: (options?: FocusOptions) => void;
  blur: () => void;
  getValue: () => string;
  setSelectionRange: (start: number, end: number) => void;
  handleKeyDown: (event: KeyboardEvent | ReactKeyboardEvent) => void;
  insertText: (text: string, composing?: boolean) => void;
  scrollIntoView: () => void;
  moveCaret: (direction: "left" | "right", extendSelection?: boolean) => void;
  copySelection: () => Promise<void>;
  pasteClipboard: () => Promise<void>;
  cutSelection: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
}
export interface VirtualInputProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange" | "defaultValue"
> {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  /** Compatibility callback; target/currentTarget expose value, not a native input element. */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  onValueChange?: (value: string) => void;
  onClipboardError?: (error: Error) => void;
  mode?: InputMode;
  layout?: KeypadLayout;
  filterKey?: (key: string) => boolean;
  sanitizeValue?: (value: string) => string;
  disabled?: boolean;
  readOnly?: boolean;
  /** UTF-16 length, matching HTML input maxLength. */
  maxLength?: number;
}

export const VirtualInput = forwardRef<VirtualInputHandle, VirtualInputProps>(
  function VirtualInput(
    {
      value,
      defaultValue = "",
      placeholder,
      onChange,
      onValueChange,
      onClipboardError,
      mode = "text",
      layout,
      filterKey,
      sanitizeValue,
      disabled = false,
      readOnly = false,
      maxLength,
      ...props
    }: VirtualInputProps,
    forwardedRef,
  ) {
    const token = useId();
    const {
      focusId,
      onFocus,
      onBlur,
      defaultLayout,
      inputRef,
      hangulMode,
      theme,
      toggleKorean,
      enterSelectionMode,
    } = useVirtualInputContext();
    const host = useRef<HTMLDivElement>(null);
    const caretElement = useRef<HTMLSpanElement>(null);
    const [state, setState] = useState<EditingState>(() => ({
      value: value ?? defaultValue,
      caret: (value ?? defaultValue).length,
      anchor: (value ?? defaultValue).length,
      composing: false,
    }));
    const displayedValue = value ?? state.value;
    const current = useRef(state);
    const revision = useRef(0);
    const history = useRef(new EditHistory());
    const mounted = useRef(false);
    const focused = focusId === token;
    const focusedRef = useRef(focused);
    focusedRef.current = focused;
    const controlledChanged = value !== undefined && value !== state.value;
    if (controlledChanged) history.current.clear();
    current.current = {
      ...state,
      value: displayedValue,
      caret: clampBoundary(displayedValue, state.caret),
      anchor: clampBoundary(displayedValue, state.anchor),
      composing: controlledChanged ? false : state.composing,
    };
    const policy = useMemo(
      () =>
        resolveInputPolicy({
          mode,
          layout:
            layout ??
            (mode === "text" || mode === "custom" ? defaultLayout : undefined),
          filterKey,
          sanitizeValue,
        }),
      [mode, layout, defaultLayout, filterKey, sanitizeValue],
    );
    const [status, setStatus] = useState("");
    const longPress = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const drag = useRef<{
      id: number;
      x: number;
      y: number;
      anchor: number;
      mouse: boolean;
      held: boolean;
    } | null>(null);
    const cancelDrag = useCallback(() => {
      clearTimeout(longPress.current);
      drag.current = null;
    }, []);
    useEffect(() => {
      if (disabled || readOnly) cancelDrag();
    }, [disabled, readOnly, cancelDrag]);
    useEffect(() => {
      const cancelMultiplePointers = (event: globalThis.PointerEvent) => {
        if (drag.current && drag.current.id !== event.pointerId) cancelDrag();
      };
      window.addEventListener("blur", cancelDrag);
      window.addEventListener("scroll", cancelDrag, true);
      window.addEventListener("pointerdown", cancelMultiplePointers, true);
      document.addEventListener("visibilitychange", cancelDrag);
      return () => {
        cancelDrag();
        window.removeEventListener("blur", cancelDrag);
        window.removeEventListener("scroll", cancelDrag, true);
        window.removeEventListener("pointerdown", cancelMultiplePointers, true);
        document.removeEventListener("visibilitychange", cancelDrag);
      };
    }, [cancelDrag]);

    const commit = useCallback(
      (next: EditingState, record = true) => {
        const previous = current.current.value;
        if (record) history.current.record(current.current, next);
        current.current = next;
        revision.current++;
        setState(next);
        if (next.value !== previous) {
          onValueChange?.(next.value);
          const target = { value: next.value } as HTMLInputElement;
          onChange?.({
            target,
            currentTarget: target,
          } as ChangeEvent<HTMLInputElement>);
        }
      },
      [onChange, onValueChange],
    );

    const insert = useCallback(
      (text: string, composing = false) => {
        if (disabled || readOnly) return;
        const sanitized = policy.sanitizeValue(text).replace(/[\r\n\t]+/g, " ");
        if (!sanitized) return;
        commit(insertText(current.current, sanitized, composing, maxLength));
      },
      [disabled, readOnly, policy, maxLength, commit],
    );

    const undo = useCallback(() => {
      if (!disabled && !readOnly)
        commit(history.current.undo(current.current), false);
    }, [disabled, readOnly, commit]);
    const redo = useCallback(() => {
      if (!disabled && !readOnly)
        commit(history.current.redo(current.current), false);
    }, [disabled, readOnly, commit]);
    const selectAll = useCallback(
      () =>
        commit({
          ...current.current,
          caret: current.current.value.length,
          anchor: 0,
          composing: false,
        }),
      [commit],
    );

    const moveCaret = useCallback(
      (direction: "left" | "right", extend = false) =>
        commit(move(current.current, direction === "left" ? -1 : 1, extend)),
      [commit],
    );
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        commit({ ...current.current, composing: false });
        onBlur(true);
        host.current?.blur();
        return;
      }
      if (key === "HangulMode") {
        event.preventDefault();
        commit({ ...current.current, composing: false });
        toggleKorean();
        return;
      }
      const command = event.ctrlKey || event.metaKey;
      if (command && ["z", "y"].includes(key.toLowerCase())) {
        event.preventDefault();
        if (key.toLowerCase() === "y" || event.shiftKey) redo();
        else undo();
        return;
      }
      if (command && key.toLowerCase() === "a") {
        event.preventDefault();
        commit({
          ...current.current,
          caret: current.current.value.length,
          anchor: 0,
          composing: false,
        });
        return;
      }
      const navigation =
        key === "Home" || key === "ArrowUp" || (command && key === "ArrowLeft")
          ? "home"
          : key === "End" ||
              key === "ArrowDown" ||
              (command && key === "ArrowRight")
            ? "end"
            : key === "ArrowLeft"
              ? -1
              : key === "ArrowRight"
                ? 1
                : null;
      if (navigation !== null) {
        event.preventDefault();
        commit(move(current.current, navigation, event.shiftKey));
        return;
      }
      if (key === "Tab" || key === "Enter") {
        commit({ ...current.current, composing: false });
        return;
      }
      if (readOnly) return;
      if (key === "Backspace" || key === "Delete") {
        event.preventDefault();
        commit(deleteText(current.current, key === "Backspace" ? -1 : 1));
        return;
      }
      const result = parseKeyInput(
        event,
        getForcedHangulMode(policy.mode) ?? hangulMode,
      );
      if (result.handled && result.text) {
        event.preventDefault();
        if (policy.filterKey(result.text))
          insert(result.text, result.composing);
      }
    };

    const reportError = useCallback(
      (cause: unknown) => {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        if (mounted.current) {
          setStatus(
            "클립보드에 접근할 수 없습니다. 키보드의 복사·붙여넣기 단축키를 사용해 주세요.",
          );
          onClipboardError?.(error);
        }
      },
      [onClipboardError],
    );
    const copySelection = useCallback(async () => {
      const [start, end] = selectionRange(current.current);
      if (start === end) return;
      await navigator.clipboard.writeText(
        current.current.value.slice(start, end),
      );
      if (mounted.current) setStatus("선택한 내용을 복사했습니다.");
    }, []);
    const cutSelection = useCallback(async () => {
      if (disabled || readOnly) return;
      const snapshot = current.current;
      const version = revision.current;
      if (snapshot.anchor === snapshot.caret) return;
      await copySelection();
      if (
        mounted.current &&
        focusedRef.current &&
        revision.current === version &&
        current.current.value === snapshot.value
      )
        commit(deleteText(snapshot, -1));
    }, [disabled, readOnly, copySelection, commit]);
    const pasteClipboard = useCallback(async () => {
      if (disabled || readOnly) return;
      const version = revision.current;
      const previousValue = current.current.value;
      const text = await navigator.clipboard.readText();
      if (
        mounted.current &&
        focusedRef.current &&
        revision.current === version &&
        current.current.value === previousValue
      )
        insert(text);
    }, [disabled, readOnly, insert]);
    const handle = useMemo<VirtualInputHandle>(
      () => ({
        focus: (options) => {
          if (!disabled) host.current?.focus(options);
        },
        blur: () => {
          host.current?.blur();
          if (focusedRef.current) onBlur(true);
        },
        getValue: () => current.current.value,
        setSelectionRange: (start, end) =>
          commit({
            ...current.current,
            anchor: clampBoundary(current.current.value, start),
            caret: clampBoundary(current.current.value, end),
            composing: false,
          }),
        handleKeyDown: (event) =>
          host.current?.dispatchEvent(
            new KeyboardEvent("keydown", {
              key: event.key,
              shiftKey: event.shiftKey,
              ctrlKey: event.ctrlKey,
              metaKey: event.metaKey,
              altKey: event.altKey,
              code: event.code,
              bubbles: true,
              cancelable: true,
            }),
          ),
        insertText: (text, composing) => {
          if (policy.filterKey(text)) insert(text, composing);
        },
        scrollIntoView: () =>
          host.current?.scrollIntoView({ block: "nearest", inline: "nearest" }),
        moveCaret,
        undo,
        redo,
        selectAll,
        copySelection: () => copySelection().catch(reportError),
        pasteClipboard: () => pasteClipboard().catch(reportError),
        cutSelection: () => cutSelection().catch(reportError),
      }),
      [
        policy,
        insert,
        moveCaret,
        copySelection,
        pasteClipboard,
        cutSelection,
        reportError,
        undo,
        redo,
        selectAll,
        disabled,
        onBlur,
        commit,
      ],
    );

    useImperativeHandle(forwardedRef, () => handle, [handle]);

    useEffect(() => {
      if (!focused)
        setState((previous) =>
          previous.composing ? { ...previous, composing: false } : previous,
        );
    }, [focused]);
    useEffect(() => {
      if (!focused || disabled || readOnly) return;
      inputRef.current = handle;
      return () => {
        if (inputRef.current === handle) inputRef.current = null;
      };
    }, [focused, disabled, readOnly, handle, inputRef]);
    useEffect(() => {
      if (focused && host.current) {
        if (disabled || readOnly) onBlur(true);
        else onFocus(token, host.current, policy);
      }
    }, [focused, disabled, readOnly, token, policy, onFocus, onBlur]);
    useEffect(() => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        clearTimeout(longPress.current);
        if (focusedRef.current) onBlur(true);
      };
    }, [onBlur]);
    useEffect(() => {
      if (!focused || !host.current || !caretElement.current) return;
      const box = host.current.getBoundingClientRect();
      const caret = caretElement.current.getBoundingClientRect();
      if (caret.right > box.right - 12)
        host.current.scrollLeft += caret.right - box.right + 12;
      else if (caret.left < box.left + 12)
        host.current.scrollLeft -= box.left + 12 - caret.left;
    }, [displayedValue, state.caret, focused]);

    const nativeCopy = (
      event: ClipboardEvent<HTMLDivElement>,
      cut: boolean,
    ) => {
      if (cut) props.onCut?.(event);
      else props.onCopy?.(event);
      if (event.defaultPrevented || disabled || (cut && readOnly)) return;
      const [start, end] = selectionRange(current.current);
      if (start === end) return;
      event.preventDefault();
      event.clipboardData.setData(
        "text/plain",
        current.current.value.slice(start, end),
      );
      if (cut) commit(deleteText(current.current, -1));
    };
    const indexFromX = (x: number, nearest = true) => {
      for (const element of host.current?.querySelectorAll<HTMLElement>(
        "[data-char-index]",
      ) ?? []) {
        const rect = element.getBoundingClientRect();
        if (x < rect.left + rect.width * (nearest ? 0.5 : 1))
          return Number(element.dataset.charIndex);
      }
      return current.current.value.length;
    };
    const focusInput = () => {
      host.current?.focus({ preventScroll: true });
      if (!readOnly && host.current) onFocus(token, host.current, policy);
    };
    const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
      props.onPointerDown?.(event);
      if (event.defaultPrevented || disabled || event.button !== 0) return;
      const mouse = event.pointerType === "mouse";
      // Defer touch focus/caret changes until we know this is a tap, not a pan.
      if (!mouse) event.preventDefault();
      if (drag.current || event.isPrimary === false) {
        cancelDrag();
        return;
      }
      const index = indexFromX(event.clientX);
      const anchor = event.shiftKey ? current.current.anchor : index;
      drag.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        anchor,
        mouse,
        held: false,
      };
      clearTimeout(longPress.current);
      if (mouse) {
        focusInput();
        commit({ ...current.current, caret: index, anchor, composing: false });
        host.current?.setPointerCapture?.(event.pointerId);
      } else if (!readOnly) {
        longPress.current = setTimeout(() => {
          if (!drag.current) return;
          drag.current.held = true;
          const [anchor, caret] = wordRangeAt(
            current.current.value,
            indexFromX(drag.current.x, false),
          );
          focusInput();
          commit({ ...current.current, anchor, caret, composing: false });
          enterSelectionMode();
        }, 550);
      }
    };
    const [start, end] = selectionRange(current.current);
    const parts = graphemes(displayedValue);
    const caret = (
      <span
        ref={caretElement}
        aria-hidden="true"
        className="vk-caret"
        style={{
          display: "inline-block",
          width: 0,
          height: "1.1em",
          verticalAlign: "-0.15em",
          position: "relative",
        }}
      >
        {focused && !readOnly && !disabled && start === end && (
          <span
            style={{
              position: "absolute",
              height: "100%",
              borderLeft: "2px solid currentColor",
            }}
          />
        )}
      </span>
    );

    return (
      <div
        {...props}
        ref={host}
        id={props.id ?? token}
        role="textbox"
        tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
        aria-disabled={disabled || undefined}
        aria-readonly={readOnly || undefined}
        aria-multiline="false"
        aria-placeholder={placeholder}
        data-virtual-input="true"
        data-focused={focused || undefined}
        data-value={displayedValue}
        style={{
          display: "block",
          boxSizing: "border-box",
          minHeight: "2.75em",
          padding: "0.65em 0.8em",
          border: "1px solid #94a3b8",
          borderRadius: 8,
          font: "inherit",
          width: "100%",
          whiteSpace: "pre",
          overflowX: "auto",
          scrollbarWidth: "none",
          cursor: disabled ? "not-allowed" : "text",
          userSelect: "none",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
          touchAction: "manipulation",
          opacity: disabled ? 0.5 : 1,
          outlineOffset: 3,
          ...props.style,
        }}
        onFocus={(event) => {
          props.onFocus?.(event);
          if (!event.defaultPrevented && !disabled && !readOnly)
            onFocus(token, event.currentTarget, policy);
        }}
        onBlur={(event) => {
          props.onBlur?.(event);
          cancelDrag();
          if (!event.defaultPrevented) onBlur(event);
        }}
        onKeyDown={handleKeyDown}
        onCopy={(event) => nativeCopy(event, false)}
        onCut={(event) => nativeCopy(event, true)}
        onPaste={(event) => {
          props.onPaste?.(event);
          if (!event.defaultPrevented && !disabled && !readOnly) {
            event.preventDefault();
            insert(event.clipboardData.getData("text/plain"));
          }
        }}
        onPointerDown={pointerDown}
        onPointerMove={(event) => {
          props.onPointerMove?.(event);
          if (event.defaultPrevented) {
            cancelDrag();
            return;
          }
          if (!drag.current || drag.current.id !== event.pointerId) return;
          if (
            Math.hypot(
              event.clientX - drag.current.x,
              event.clientY - drag.current.y,
            ) > 8
          ) {
            clearTimeout(longPress.current);
            if (drag.current.mouse)
              commit({
                ...current.current,
                caret: indexFromX(event.clientX),
                anchor: drag.current.anchor,
                composing: false,
              });
            else cancelDrag();
          }
        }}
        onPointerUp={(event) => {
          props.onPointerUp?.(event);
          const gesture = drag.current;
          if (
            !event.defaultPrevented &&
            gesture?.id === event.pointerId &&
            !gesture.mouse &&
            !gesture.held &&
            Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <=
              8
          ) {
            const index = indexFromX(event.clientX);
            focusInput();
            commit({
              ...current.current,
              caret: index,
              anchor: index,
              composing: false,
            });
          }
          cancelDrag();
        }}
        onPointerCancel={(event) => {
          props.onPointerCancel?.(event);
          cancelDrag();
        }}
        onLostPointerCapture={(event) => {
          props.onLostPointerCapture?.(event);
          if (drag.current?.id === event.pointerId) cancelDrag();
        }}
        onContextMenu={(event) => {
          props.onContextMenu?.(event);
          if (!event.defaultPrevented) event.preventDefault();
        }}
      >
        {parts.map(({ segment, index }) => (
          <span key={index}>
            {index === current.current.caret && caret}
            <span
              data-char-index={index}
              style={
                index >= start && index < end
                  ? { background: "#bfdbfe", color: "#0f172a" }
                  : undefined
              }
            >
              {segment}
            </span>
          </span>
        ))}
        {current.current.caret === displayedValue.length && caret}
        {!displayedValue && (
          <span
            aria-hidden="true"
            style={{ color: theme === "dark" ? "#a6b7a9" : "#58665d" }}
          >
            {placeholder || "\u00a0"}
          </span>
        )}
        <span
          role="status"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clipPath: "inset(50%)",
            whiteSpace: "nowrap",
          }}
        >
          {status}
        </span>
      </div>
    );
  },
);
