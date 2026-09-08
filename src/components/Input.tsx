import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
import { readDOMSelection, writeDOMSelection } from "../utils/domSelection.js";

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

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
      setEditingStatus,
    } = useVirtualInputContext();
    const host = useRef<HTMLDivElement>(null);
    const textElement = useRef<HTMLSpanElement>(null);
    const caretElement = useRef<HTMLSpanElement>(null);
    const pendingDOMSelection = useRef(false);
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
      (next: EditingState, record = true, nativeSelection = false) => {
        const previous = current.current.value;
        if (record) history.current.record(current.current, next);
        pendingDOMSelection.current = !nativeSelection;
        current.current = next;
        revision.current++;
        setStatus("");
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

    const readNativeSelection = useCallback(() => {
      const text = textElement.current;
      if (
        !text ||
        disabled ||
        pendingDOMSelection.current ||
        text.textContent !== current.current.value
      )
        return null;
      const selection = readDOMSelection(text);
      if (!selection) return null;
      const anchor = clampBoundary(current.current.value, selection.anchor);
      const caret = clampBoundary(current.current.value, selection.caret);
      if (
        anchor !== current.current.anchor ||
        caret !== current.current.caret ||
        anchor !== selection.anchor ||
        caret !== selection.caret
      ) {
        commit(
          { ...current.current, anchor, caret, composing: false },
          false,
          anchor === selection.anchor && caret === selection.caret,
        );
      }
      return { anchor, caret };
    }, [disabled, commit]);

    useEffect(() => {
      const changed = () => {
        const selection = readNativeSelection();
        if (selection && selection.anchor !== selection.caret) {
          clearTimeout(longPress.current);
          if (drag.current) drag.current.held = true;
          if (!readOnly && host.current && !focusedRef.current) {
            host.current.focus({ preventScroll: true });
            onFocus(token, host.current, policy);
          }
        }
      };
      document.addEventListener("selectionchange", changed);
      return () => document.removeEventListener("selectionchange", changed);
    }, [readNativeSelection, readOnly, onFocus, token, policy]);

    useBrowserLayoutEffect(() => {
      if (
        (focused || document.activeElement === host.current) &&
        !disabled &&
        textElement.current &&
        (pendingDOMSelection.current || controlledChanged)
      ) {
        writeDOMSelection(
          textElement.current,
          current.current.anchor,
          current.current.caret,
        );
      }
      pendingDOMSelection.current = false;
    });

    useEffect(() => {
      if (!focused) return;
      const [start, end] = selectionRange(current.current);
      setEditingStatus({
        selectionLength: graphemes(displayedValue.slice(start, end)).length,
        hasValue: !!displayedValue,
        message: status,
      });
    }, [
      displayedValue,
      state.anchor,
      state.caret,
      status,
      focused,
      setEditingStatus,
    ]);

    const insert = useCallback(
      (text: string, composing = false) => {
        if (disabled || readOnly) return;
        readNativeSelection();
        const sanitized = policy.sanitizeValue(text).replace(/[\r\n\t]+/g, " ");
        if (!sanitized) return;
        commit(insertText(current.current, sanitized, composing, maxLength));
      },
      [disabled, readOnly, policy, maxLength, commit, readNativeSelection],
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
      (direction: "left" | "right", extend = false) => {
        readNativeSelection();
        commit(move(current.current, direction === "left" ? -1 : 1, extend));
      },
      [commit, readNativeSelection],
    );
    const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;
      readNativeSelection();
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
            "클립보드에 접근할 수 없습니다. 선택한 글자를 길게 눌러 기본 복사 메뉴를 사용해 주세요.",
          );
          onClipboardError?.(error);
        }
      },
      [onClipboardError],
    );
    const copySelection = useCallback(async () => {
      readNativeSelection();
      const [start, end] = selectionRange(current.current);
      if (start === end) return;
      const text = current.current.value.slice(start, end);
      try {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(text);
      } catch (error) {
        // Older WebViews can copy the real DOM selection without Clipboard API permission.
        if (
          !textElement.current ||
          document.getSelection()?.toString() !== text ||
          !document.execCommand?.("copy")
        )
          throw error;
      }
      if (mounted.current) setStatus("복사했어요");
    }, [readNativeSelection]);
    const cutSelection = useCallback(async () => {
      if (disabled || readOnly) return;
      readNativeSelection();
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
    }, [disabled, readOnly, copySelection, commit, readNativeSelection]);
    const pasteClipboard = useCallback(async () => {
      if (disabled || readOnly) return;
      readNativeSelection();
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
    }, [disabled, readOnly, insert, readNativeSelection]);
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
    useBrowserLayoutEffect(() => {
      if (!host.current || !textElement.current || !caretElement.current)
        return;
      const update = () => {
        const field = host.current!;
        const text = textElement.current!;
        const box = field.getBoundingClientRect();
        const character = text.querySelector<HTMLElement>(
          `[data-char-index="${current.current.caret}"]`,
        );
        const rect = (character ?? text).getBoundingClientRect();
        const x = character || !current.current.value ? rect.left : rect.right;
        Object.assign(caretElement.current!.style, {
          left: `${x - box.left + field.scrollLeft - field.clientLeft}px`,
          top: `${rect.top - box.top + field.scrollTop - field.clientTop}px`,
          height: `${rect.height}px`,
        });
        if (!focused || current.current.anchor !== current.current.caret)
          return;
        if (x > box.right - 12) field.scrollLeft += x - box.right + 12;
        else if (x < box.left + 12) field.scrollLeft -= box.left + 12 - x;
      };
      update();
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver(update);
      observer?.observe(host.current);
      return () => observer?.disconnect();
    }, [displayedValue, state.caret, state.anchor, focused]);

    const nativeCopy = (
      event: ClipboardEvent<HTMLDivElement>,
      cut: boolean,
    ) => {
      if (cut) props.onCut?.(event);
      else props.onCopy?.(event);
      if (event.defaultPrevented || disabled || (cut && readOnly)) return;
      const selection = document.getSelection();
      if (
        selection &&
        !selection.isCollapsed &&
        textElement.current &&
        !readDOMSelection(textElement.current)
      )
        return;
      readNativeSelection();
      const [start, end] = selectionRange(current.current);
      if (start === end) return;
      event.preventDefault();
      event.clipboardData.setData(
        "text/plain",
        current.current.value.slice(start, end),
      );
      if (cut) commit(deleteText(current.current, -1));
      else setStatus("복사했어요");
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
    const selectWord = (x: number) => {
      const [anchor, caret] = wordRangeAt(
        current.current.value,
        indexFromX(x, false),
      );
      focusInput();
      commit({ ...current.current, anchor, caret, composing: false });
    };
    const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
      props.onPointerDown?.(event);
      if (event.defaultPrevented || disabled || event.button !== 0) return;
      const mouse = event.pointerType === "mouse";
      // Leave native text selection and the OS context menu enabled. Touch focus
      // is still deferred so a vertical pan does not open the custom keypad.
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
      } else {
        longPress.current = setTimeout(() => {
          if (!drag.current) return;
          drag.current.held = true;
          selectWord(drag.current.x);
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
          display:
            focused && !readOnly && !disabled && start === end
              ? "block"
              : "none",
          width: 0,
          height: "1.1em",
          position: "absolute",
          pointerEvents: "none",
          userSelect: "none",
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
          position: "relative",
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
          userSelect: disabled ? "none" : "text",
          WebkitUserSelect: disabled ? "none" : "text",
          WebkitTouchCallout: "default",
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
        onDoubleClick={(event) => {
          props.onDoubleClick?.(event);
          if (event.defaultPrevented || disabled || event.button !== 0) return;
          event.preventDefault();
          // Segment the touched glyph, including the final Korean character;
          // Chromium can otherwise choose the following whitespace at its midpoint.
          selectWord(event.clientX);
        }}
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
            if (!drag.current.mouse) cancelDrag();
          }
        }}
        onPointerUp={(event) => {
          props.onPointerUp?.(event);
          const gesture = drag.current;
          if (
            !event.defaultPrevented &&
            gesture?.id === event.pointerId &&
            !gesture.held &&
            Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) <=
              8
          ) {
            const native = readNativeSelection();
            if (!native || (!gesture.mouse && native.anchor === native.caret)) {
              const index = indexFromX(event.clientX);
              focusInput();
              commit({
                ...current.current,
                caret: index,
                anchor: event.shiftKey ? gesture.anchor : index,
                composing: false,
              });
            }
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
          if (!event.defaultPrevented) readNativeSelection();
        }}
      >
        <span ref={textElement} data-input-text="true">
          {parts.map(({ segment, index }) => (
            <span key={index} data-char-index={index}>
              {segment}
            </span>
          ))}
        </span>
        {caret}
        {!displayedValue && (
          <span
            aria-hidden="true"
            style={{
              color: theme === "dark" ? "#a6b7a9" : "#58665d",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
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
            userSelect: "none",
            WebkitUserSelect: "none",
          }}
        >
          {status}
        </span>
      </div>
    );
  },
);
