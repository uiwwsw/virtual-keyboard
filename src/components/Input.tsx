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
  type EditingState,
} from "../utils/editing.js";
import type { InputMode } from "../types/inputPolicy.js";
import type { KeypadLayout } from "../types/keyboard.js";
import { nativeEdit } from "../utils/nativeEditing.js";

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
    const editor = useRef<HTMLInputElement>(null);
    const pendingDOMSelection = useRef(false);
    const nativeComposing = useRef(false);
    const compositionBase = useRef<EditingState | null>(null);
    const [nativeDraft, setNativeDraft] = useState<string | null>(null);
    const [fieldFocused, setFieldFocused] = useState(false);
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
    const [pasting, setPasting] = useState(false);
    const pasteRequest = useRef<{
      value: string;
      policy: typeof policy;
      maxLength: number | undefined;
    } | null>(null);
    const pasteFeedback = useRef<string | null>(null);
    const editSettings = useRef({ disabled, readOnly, policy, maxLength });
    editSettings.current = { disabled, readOnly, policy, maxLength };
    const cancelPaste = useCallback(() => {
      if (!pasteRequest.current) return;
      pasteRequest.current = null;
      setPasting(false);
    }, []);

    useEffect(() => {
      const request = pasteRequest.current;
      if (
        request &&
        (!focused ||
          disabled ||
          readOnly ||
          request.policy !== policy ||
          request.maxLength !== maxLength ||
          request.value !== displayedValue)
      )
        cancelPaste();
    }, [
      focused,
      disabled,
      readOnly,
      policy,
      maxLength,
      displayedValue,
      cancelPaste,
    ]);

    const commit = useCallback(
      (next: EditingState, record = true, nativeSelection = false) => {
        cancelPaste();
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
      [onChange, onValueChange, cancelPaste],
    );

    const readNativeSelection = useCallback(() => {
      const field = editor.current;
      if (
        !field ||
        disabled ||
        pendingDOMSelection.current ||
        field.value !== current.current.value ||
        nativeComposing.current
      )
        return null;
      const start = field.selectionStart ?? 0;
      const end = field.selectionEnd ?? start;
      const selection =
        field.selectionDirection === "backward"
          ? { anchor: end, caret: start }
          : { anchor: start, caret: end };
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
        if (document.activeElement === editor.current) readNativeSelection();
      };
      const field = editor.current;
      document.addEventListener("selectionchange", changed);
      field?.addEventListener("select", changed);
      return () => {
        document.removeEventListener("selectionchange", changed);
        field?.removeEventListener("select", changed);
      };
    }, [readNativeSelection]);

    useBrowserLayoutEffect(() => {
      if (
        compositionBase.current &&
        compositionBase.current.value !== displayedValue
      ) {
        nativeComposing.current = false;
        compositionBase.current = null;
        setNativeDraft(null);
      }
      if (
        !disabled &&
        editor.current &&
        !nativeComposing.current &&
        (pendingDOMSelection.current || controlledChanged)
      ) {
        const { anchor, caret } = current.current;
        const start = Math.min(anchor, caret),
          end = Math.max(anchor, caret);
        const direction = anchor > caret ? "backward" : "forward";
        if (
          editor.current.selectionStart !== start ||
          editor.current.selectionEnd !== end ||
          (start !== end && editor.current.selectionDirection !== direction)
        )
          editor.current.setSelectionRange(start, end, direction);
      }
      pendingDOMSelection.current = false;
      if (pasteFeedback.current !== null) {
        setStatus(
          displayedValue === pasteFeedback.current
            ? "붙여넣었어요"
            : "입력값이 적용되지 않았어요",
        );
        pasteFeedback.current = null;
      }
    });

    useEffect(() => {
      if (!focused) return;
      const [start, end] = selectionRange(current.current);
      setEditingStatus({
        selectionLength: graphemes(displayedValue.slice(start, end)).length,
        hasValue: !!displayedValue,
        message: status,
        pasting,
      });
    }, [
      displayedValue,
      state.anchor,
      state.caret,
      status,
      pasting,
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

    const insertPastedText = useCallback(
      (text: string) => {
        if (disabled || readOnly || nativeComposing.current) return;
        readNativeSelection();
        if (!text) {
          setStatus("붙여넣을 텍스트가 없어요");
          return;
        }
        const sanitized = policy.sanitizeValue(text).replace(/[\r\n\t]+/g, " ");
        if (!sanitized || !policy.filterKey(sanitized)) {
          setStatus("이 입력란에 붙여넣을 수 없는 내용이에요");
          return;
        }
        const next = insertText(current.current, sanitized, false, maxLength);
        if (next === current.current) {
          setStatus("입력 길이 제한을 초과했어요");
          return;
        }
        pasteFeedback.current = next.value;
        commit(next);
        editor.current?.focus({ preventScroll: true });
      },
      [disabled, readOnly, policy, maxLength, readNativeSelection, commit],
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
      if (
        nativeComposing.current ||
        event.nativeEvent.isComposing ||
        event.keyCode === 229
      )
        return;
      readNativeSelection();
      const key = event.key;
      if (key === "Escape") {
        event.preventDefault();
        commit({ ...current.current, composing: false });
        onBlur(true);
        editor.current?.blur();
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
        if (key === "Enter") event.preventDefault();
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
            "클립보드에 접근할 수 없습니다. 입력란을 길게 눌러 기본 편집 메뉴를 사용해 주세요.",
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
      const value = current.current.value;
      const text = current.current.value.slice(start, end);
      try {
        if (!navigator.clipboard?.writeText)
          throw new Error("Clipboard API unavailable");
        await navigator.clipboard.writeText(text);
      } catch (error) {
        readNativeSelection();
        const field = editor.current;
        const [currentStart, currentEnd] = selectionRange(current.current);
        if (
          !field ||
          !mounted.current ||
          current.current.value !== value ||
          currentStart !== start ||
          currentEnd !== end
        )
          throw error;
        let previousFocus = document.activeElement;
        const keypadFocused = previousFocus?.hasAttribute(
          "data-virtual-keypad",
        );
        if (previousFocus !== field && !keypadFocused) throw error;
        while (previousFocus?.shadowRoot?.activeElement)
          previousFocus = previousFocus.shadowRoot.activeElement;
        field.focus({ preventScroll: true });
        try {
          if (!document.execCommand?.("copy")) throw error;
        } finally {
          if (
            previousFocus instanceof HTMLElement &&
            previousFocus !== field &&
            keypadFocused
          )
            previousFocus.focus({ preventScroll: true });
        }
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
      if (
        disabled ||
        readOnly ||
        nativeComposing.current ||
        pasteRequest.current
      )
        return;
      readNativeSelection();
      const request = { value: current.current.value, policy, maxLength };
      pasteRequest.current = request;
      setPasting(true);
      setStatus("");
      const isCurrent = () =>
        pasteRequest.current === request &&
        mounted.current &&
        focusedRef.current &&
        !editSettings.current.disabled &&
        !editSettings.current.readOnly &&
        editSettings.current.policy === request.policy &&
        editSettings.current.maxLength === request.maxLength &&
        current.current.value === request.value;
      try {
        if (!navigator.clipboard?.readText)
          throw new Error("Clipboard read unavailable");
        const text = await navigator.clipboard.readText();
        // Read again before using an async result: the OS may have moved its
        // selection before React receives selectionchange, or pasted natively.
        readNativeSelection();
        if (isCurrent()) insertPastedText(text);
      } catch (error) {
        readNativeSelection();
        if (isCurrent()) {
          editor.current?.focus({ preventScroll: true });
          reportError(error);
          setStatus(
            "클립보드를 읽을 수 없어요. 입력란을 길게 눌러 ‘붙여넣기’를 선택해 주세요.",
          );
        }
      } finally {
        if (pasteRequest.current === request) cancelPaste();
      }
    }, [
      disabled,
      readOnly,
      policy,
      maxLength,
      insertPastedText,
      readNativeSelection,
      reportError,
      cancelPaste,
    ]);
    const handle = useMemo<VirtualInputHandle>(
      () => ({
        focus: (options) => {
          if (!disabled) editor.current?.focus(options);
        },
        blur: () => {
          editor.current?.blur();
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
          editor.current?.dispatchEvent(
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
        pasteRequest.current = null;
        if (focusedRef.current) onBlur(true);
      };
    }, [onBlur]);
    const nativeCopy = (
      event: ClipboardEvent<HTMLDivElement>,
      cut: boolean,
    ) => {
      if (cut) props.onCut?.(event);
      else props.onCopy?.(event);
      if (event.defaultPrevented || disabled || (cut && readOnly)) return;
      if (event.target !== editor.current) return;
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
    const acceptNativeValue = (field: HTMLInputElement) => {
      if (disabled || readOnly) return;
      const next = nativeEdit(
        current.current,
        field.value,
        {
          start: field.selectionStart ?? field.value.length,
          end: field.selectionEnd ?? field.value.length,
          backward: field.selectionDirection === "backward",
        },
        policy.sanitizeValue,
        policy.filterKey,
        maxLength,
      );
      // Restore rejected edits synchronously, including a controlled parent veto.
      field.value = next.value;
      commit({ ...next });
    };
    const ariaProps = Object.fromEntries(
      Object.entries(props).filter(([key]) => key.startsWith("aria-")),
    );
    const containerProps = Object.fromEntries(
      Object.entries(props).filter(
        ([key]) =>
          !key.startsWith("aria-") &&
          !["id", "tabIndex", "role", "contentEditable", "children"].includes(
            key,
          ),
      ),
    );

    return (
      <div
        {...containerProps}
        ref={host}
        data-virtual-input="true"
        data-focused={focused || undefined}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          minHeight: "2.75em",
          padding: "0.65em 0.8em",
          border: "1px solid #94a3b8",
          borderRadius: 8,
          font: "inherit",
          width: "100%",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.5 : 1,
          colorScheme: theme,
          outline: fieldFocused ? "2px solid currentColor" : undefined,
          outlineOffset: 2,
          ...props.style,
        }}
        onFocus={(event) => {
          setFieldFocused(true);
          props.onFocus?.(event);
          if (!event.defaultPrevented && !disabled && !readOnly)
            onFocus(token, event.currentTarget, policy);
        }}
        onBlur={(event) => {
          setFieldFocused(false);
          if (
            event.relatedTarget instanceof Element &&
            !event.relatedTarget.closest("[data-virtual-keypad]")
          )
            cancelPaste();
          props.onBlur?.(event);
          if (!event.defaultPrevented) onBlur(event);
        }}
        onKeyDown={handleKeyDown}
        onCopy={(event) => nativeCopy(event, false)}
        onCut={(event) => nativeCopy(event, true)}
        onPaste={(event) => {
          props.onPaste?.(event);
          if (!event.defaultPrevented && !disabled && !readOnly) {
            event.preventDefault();
            cancelPaste();
            insertPastedText(event.clipboardData.getData("text/plain"));
          }
        }}
      >
        <input
          {...ariaProps}
          ref={editor}
          id={props.id ?? token}
          type="text"
          role="textbox"
          inputMode="none"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={props.spellCheck ?? false}
          tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
          disabled={disabled}
          readOnly={readOnly}
          aria-disabled={disabled || undefined}
          aria-readonly={readOnly || undefined}
          data-virtual-input="true"
          data-focused={focused || undefined}
          data-value={displayedValue}
          placeholder={placeholder}
          value={nativeDraft ?? displayedValue}
          style={{
            position: "absolute",
            inset: 0,
            boxSizing: "border-box",
            display: "block",
            width: "100%",
            height: "100%",
            minWidth: 0,
            minHeight: "1.5em",
            margin: 0,
            padding: "inherit",
            border: 0,
            borderRadius: "inherit",
            outline: "none",
            background: "transparent",
            color: "inherit",
            caretColor: "currentColor",
            font: "inherit",
            lineHeight: "inherit",
            letterSpacing: "inherit",
            textAlign: "inherit",
            appearance: "none",
            WebkitAppearance: "none",
            userSelect: "text",
            WebkitUserSelect: "text",
            touchAction: "manipulation",
          }}
          onChange={(event) => {
            if (nativeComposing.current)
              setNativeDraft(event.currentTarget.value);
            else acceptNativeValue(event.currentTarget);
          }}
          onSelect={readNativeSelection}
          onCompositionStart={() => {
            cancelPaste();
            readNativeSelection();
            compositionBase.current = current.current;
            nativeComposing.current = true;
            setNativeDraft(editor.current?.value ?? current.current.value);
          }}
          onCompositionEnd={(event) => {
            nativeComposing.current = false;
            setNativeDraft(null);
            if (compositionBase.current?.value === current.current.value)
              acceptNativeValue(event.currentTarget);
            else {
              event.currentTarget.value = current.current.value;
              commit({ ...current.current });
            }
            compositionBase.current = null;
          }}
        />
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
