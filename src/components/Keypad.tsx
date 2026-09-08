import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import symbols from "../assets/symbols.json";
import { createPortal } from "react-dom";
import { ShadowWrapper } from "./ShadowWrapper.js";
import { useVirtualInputContext } from "./Context.js";
import { getForcedHangulMode } from "../utils/inputPolicy.js";
import { transformKey } from "../utils/keyboard.js";
import { isHangul } from "../utils/isHangul.js";
import type { Key, KeypadLayout, Viewport } from "../types/keyboard.js";
export type { KeypadLayout, Viewport };

const labels: Record<string, string> = {
  Shift: "Shift",
  HangulMode: "한영 전환",
  Backspace: "지우기",
  Delete: "앞 글자 지우기",
  Enter: "입력 완료",
  EnterSelectionMode: "텍스트 편집",
  ExitSelectionMode: "키보드로 돌아가기",
  ToggleSelectionAdjust: "선택 범위 조절",
  ArrowLeft: "커서 왼쪽",
  ArrowRight: "커서 오른쪽",
  Copy: "복사",
  Paste: "붙여넣기",
  Cut: "잘라내기",
  " ": "공백",
  Undo: "실행 취소",
  Redo: "다시 실행",
  SelectAll: "전체 선택",
};

function KeyButton({
  cell,
  label,
  value,
  active,
  disabled,
  dispatch,
}: {
  cell: Key;
  label: string;
  value: string;
  active?: boolean;
  disabled?: boolean;
  dispatch: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(dispatch);
  latest.current = dispatch;
  const languageKey = cell.type === "action" && value === "HangulMode";
  const cancel = useCallback(() => clearTimeout(timer.current), []);
  useEffect(() => {
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      cancel();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [cancel]);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={labels[value] ?? label}
      aria-pressed={active}
      className={
        languageKey
          ? "key action language"
          : cell.type === "action"
            ? "key action"
            : "key"
      }
      title={
        languageKey
          ? disabled
            ? `${active ? "한국어" : "영어"} 전용`
            : `${active ? "영어" : "한국어"}로 전환`
          : undefined
      }
      style={{ flex: cell.width && cell.width > 0 ? cell.width : 1 }}
      onPointerDown={(event) => {
        if (event.button !== 0 || disabled) return;
        event.preventDefault();
        cancel();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        latest.current();
        if (
          ["Backspace", "Delete", "ArrowLeft", "ArrowRight"].includes(value)
        ) {
          const tick = () => {
            latest.current();
            timer.current = setTimeout(tick, 65);
          };
          timer.current = setTimeout(tick, 450);
        }
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onPointerLeave={cancel}
      onClick={(event) => {
        if (event.detail === 0) latest.current();
      }}
    >
      {languageKey && !cell.label ? (
        <span className="language-label" aria-hidden="true">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <circle cx="12" cy="12" r="9" />
            <ellipse cx="12" cy="12" rx="4" ry="9" />
            <path d="M3 12h18" />
          </svg>
          <span>{active ? "한" : "EN"}</span>
        </span>
      ) : (
        label
      )}
    </button>
  );
}

export function VirtualKeypad({
  layout,
  viewport,
  onHeightChange,
}: {
  layout: KeypadLayout;
  viewport: Viewport;
  onHeightChange: (height: number) => void;
}) {
  const context = useVirtualInputContext();
  const {
    inputRef,
    hangulMode,
    shift,
    shiftLocked,
    theme,
    selectionMode,
    selectionAdjusting,
    activeInputPolicy,
    onBlur,
  } = context;
  const host = useRef<HTMLElement | null>(null);
  const [height, setHeight] = useState(0);
  const [symbolsMode, setSymbolsMode] = useState(false);
  const supportsSymbols = ["text", "hangul", "custom"].includes(
    activeInputPolicy.mode,
  );
  const displayedLayout =
    symbolsMode && supportsSymbols && !selectionMode ? symbols : layout;
  useEffect(() => {
    if (!host.current) return;
    const update = () => {
      const next = host.current?.getBoundingClientRect().height ?? 0;
      setHeight(next);
      onHeightChange(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(host.current);
    return () => observer.disconnect();
  }, [onHeightChange]);
  useEffect(() => {
    let tap: { x: number; y: number; id: number } | null = null;
    const inside = (event: PointerEvent) =>
      event
        .composedPath()
        .some(
          (node) =>
            node === host.current ||
            (node instanceof Element &&
              node.hasAttribute("data-virtual-input")),
        );
    const down = (event: PointerEvent) => {
      tap = inside(event)
        ? null
        : { x: event.clientX, y: event.clientY, id: event.pointerId };
    };
    const up = (event: PointerEvent) => {
      if (
        tap &&
        tap.id === event.pointerId &&
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 10 &&
        !inside(event)
      )
        onBlur(true);
      tap = null;
    };
    const cancel = () => {
      tap = null;
    };
    window.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up, true);
    window.addEventListener("pointercancel", cancel, true);
    return () => {
      window.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up, true);
      window.removeEventListener("pointercancel", cancel, true);
    };
  }, [onBlur]);

  const dispatch = (cell: Key) => {
    const value = transformKey(cell, hangulMode, shift);
    if (cell.type !== "action") {
      inputRef.current?.insertText(value, isHangul(value));
      context.consumeShift();
      return;
    }
    switch (value) {
      case "Undo":
        inputRef.current?.undo();
        break;
      case "Redo":
        inputRef.current?.redo();
        break;
      case "SelectAll":
        inputRef.current?.selectAll();
        break;
      case "Shift":
        context.toggleShift();
        break;
      case "HangulMode":
        inputRef.current?.handleKeyDown(
          new KeyboardEvent("keydown", { key: value }),
        );
        break;
      case "EnterSelectionMode":
        setSymbolsMode(false);
        context.enterSelectionMode();
        break;
      case "ExitSelectionMode":
        context.exitSelectionMode();
        break;
      case "ToggleSelectionAdjust":
        context.toggleSelectionAdjust();
        break;
      case "Copy":
        void inputRef.current?.copySelection();
        break;
      case "Paste":
        void inputRef.current?.pasteClipboard();
        break;
      case "Cut":
        void inputRef.current?.cutSelection();
        break;
      case "ArrowLeft":
        inputRef.current?.moveCaret("left", selectionAdjusting);
        break;
      case "ArrowRight":
        inputRef.current?.moveCaret("right", selectionAdjusting);
        break;
      default:
        if (value === " ") inputRef.current?.insertText(" ");
        else
          inputRef.current?.handleKeyDown(
            new KeyboardEvent("keydown", { key: value }),
          );
    }
  };
  const forced = getForcedHangulMode(activeInputPolicy.mode) !== null;
  const style: CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    boxSizing: "border-box",
    display: "block",
    width: Math.min(viewport.width || 760, 760),
    left: viewport.offsetLeft + viewport.width / 2,
    transform: "translateX(-50%)",
    ...(height && viewport.height
      ? { top: viewport.offsetTop + viewport.height - height }
      : { bottom: 0 }),
    maxHeight: viewport.height ? viewport.height * 0.65 : "65dvh",
    overflowY: "auto",
    colorScheme: theme,
    background: theme === "dark" ? "#18201f" : "#e9eeeb",
    color: theme === "dark" ? "#eef4ef" : "#203b31",
    border: "1px solid " + (theme === "dark" ? "#35413c" : "#c8d3cb"),
    borderRadius: "20px 20px 0 0",
    boxShadow: "0 -8px 48px #10251a20",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
  };
  return createPortal(
    <ShadowWrapper
      tagName="virtual-keypad"
      hostRef={host}
      data-virtual-keypad="true"
      style={style}
      // Empty space between keys belongs to the keyboard too. Prevent the
      // browser from blurring the input, including compatibility mouse events.
      onPointerDown={(event) => {
        if (event.button === 0) event.preventDefault();
      }}
      onMouseDown={(event) => {
        if (event.button === 0) event.preventDefault();
      }}
      onBlur={context.onBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onBlur(true);
        }
      }}
      css={`
        * {
          box-sizing: border-box;
        }
        .keyboard {
          padding: 10px 8px max(12px, env(safe-area-inset-bottom));
          font:
            500 16px system-ui,
            sans-serif;
        }
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 6px 8px;
          font-size: 12px;
        }
        .toolbar span {
          opacity: 0.75;
        }
        .close {
          background: transparent;
          color: inherit;
          border: 0;
          padding: 8px 12px;
          cursor: pointer;
          border-radius: 6px;
        }
        .row {
          display: flex;
          gap: clamp(3px, 1vw, 7px);
          margin-top: 7px;
        }
        .key {
          min-width: 0;
          min-height: 44px;
          border: 0;
          border-radius: 8px;
          background: ${theme === "dark" ? "#303c37" : "#fff"};
          color: inherit;
          box-shadow: 0 2px 0 ${theme === "dark" ? "#0d1611" : "#bdc9c1"};
          font: inherit;
          padding: 8px 0;
          touch-action: none;
          cursor: pointer;
          user-select: none;
        }
        .action {
          background: ${theme === "dark" ? "#414e46" : "#d7e1db"};
          font-size: 14px;
        }
        .key[aria-pressed="true"]:not(.language) {
          background: #246447;
          color: #fff;
        }
        .language-label {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }
        .language-label svg {
          flex-shrink: 0;
        }
        .language-label span {
          min-width: 1.5em;
        }
        .key:active {
          transform: translateY(2px);
          box-shadow: none;
        }
        button:focus-visible {
          outline: 3px solid #48a97e;
          outline-offset: 2px;
        }
        button:disabled {
          opacity: 0.38;
          cursor: default;
        }
        @media (max-height: 500px) {
          .key {
            min-height: 32px;
            padding: 5px 0;
          }
          .toolbar {
            padding-bottom: 0;
          }
        }
      `}
    >
      <section className="keyboard" role="group" aria-label="가상 키보드">
        <div className="toolbar">
          <span>
            {selectionMode
              ? "텍스트 편집"
              : symbolsMode && supportsSymbols
                ? "숫자 · 기호"
                : activeInputPolicy.mode === "number"
                  ? "숫자"
                  : activeInputPolicy.mode === "tel"
                    ? "전화번호"
                    : hangulMode
                      ? "한국어 · 두벌식"
                      : "English"}
            {shiftLocked ? " · Shift 고정" : ""}
          </span>
          {supportsSymbols && !selectionMode && (
            <button
              type="button"
              className="close"
              aria-label="숫자·기호 전환"
              aria-pressed={symbolsMode}
              onPointerDown={(event) => {
                if (event.button === 0) {
                  event.preventDefault();
                  setSymbolsMode((previous) => !previous);
                }
              }}
              onClick={(event) => {
                if (event.detail === 0) setSymbolsMode((previous) => !previous);
              }}
            >
              {symbolsMode ? "가 / ABC" : "123 / #+="}
            </button>
          )}
          <button
            type="button"
            className="close"
            onPointerDown={(event) => {
              if (event.button === 0) {
                event.preventDefault();
                onBlur(true);
              }
            }}
            onClick={(event) => {
              if (event.detail === 0) onBlur(true);
            }}
            aria-label="키보드 닫기"
          >
            닫기 ↓
          </button>
        </div>
        {displayedLayout.map((row, rowIndex) => (
          <div className="row" key={rowIndex}>
            {row.map((cell, index) => {
              const value = transformKey(cell, hangulMode, shift);
              const label =
                cell.type === "action"
                  ? (cell.label ?? labels[value] ?? value)
                  : /^[A-Za-z]$/.test(cell.value)
                    ? value
                    : (cell.label ?? value);
              const active =
                cell.value === "Shift"
                  ? shift
                  : cell.value === "HangulMode"
                    ? hangulMode
                    : cell.value === "ToggleSelectionAdjust"
                      ? selectionAdjusting
                      : undefined;
              return (
                <KeyButton
                  key={`${rowIndex}-${index}-${cell.value}`}
                  cell={cell}
                  label={label}
                  value={value}
                  active={active}
                  disabled={
                    (cell.value === "HangulMode" && forced) ||
                    ((cell.type !== "action" || value === " ") &&
                      !activeInputPolicy.filterKey(value))
                  }
                  dispatch={() => dispatch(cell)}
                />
              );
            })}
          </div>
        ))}
      </section>
    </ShadowWrapper>,
    document.body,
  );
}
