/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
/** biome-ignore-all assist/source/organizeImports: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useVirtualInputContext } from "./Context";
import {
        useCallback,
        type PointerEvent,
        type CSSProperties,
        useMemo,
        type MouseEvent as ReactMouseEvent,
} from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { convertQwertyToHangul } from "es-hangul";

declare module "react" {
	interface CSSProperties {
		[key: `--${string}`]: string | number;
	}
}

export type KeypadLayout = {
	label: string;
	value: string;
	width?: number;
	height?: number;
	type?: string;
}[][];

export type Viewport = {
	width: number;
	height: number;
	scale: number;
	offsetLeft: number;
	offsetTop: number;
};

export function VirtualKeypad({
        layout,
        viewport,
}: {
        layout: KeypadLayout;
        viewport: Viewport;
}) {
	const {
		focusId,
		onBlur,
		onFocus,
		inputRef,
		shift,
		hangulMode,
		toggleShift,
		toggleKorean,
	} = useVirtualInputContext();

	const handleFocus = useCallback(() => {
		if (!focusId) return;
		onFocus(focusId);
	}, [onFocus, focusId]);
	const getTransformedValue = useCallback(
		(cell: { label?: string; value: string; type?: string }) => {
			if (cell.type === "char") {
				if (hangulMode) {
					return convertQwertyToHangul(cell.value);
				}
				if (shift) {
					return cell.value.toUpperCase();
				}
				return cell.value;
			}

			return cell.label ?? cell.value;
		},
		[hangulMode, shift],
	);

        const triggerVirtualKey = useCallback(
                (target: HTMLButtonElement) => {
                        const { value, dataset } = target;
                        const type = dataset.type as "char" | "action";

                        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                                navigator.vibrate?.(10);
                        }

                        if (type === "action") {
                                if (value === "Shift") {
                                        toggleShift();
                                        return;
                                }
                                if (value === "HangulMode") {
                                        toggleKorean();
                                        return;
                                }
                        }

                        const event = new KeyboardEvent("keydown", {
                                key: getTransformedValue({
                                        value,
                                        type,
                                }),
                                code: `Key${value.toUpperCase()}`,
                                bubbles: true,
                                cancelable: true,
                                shiftKey: shift,
                        });
                        inputRef.current?.handleKeyDown(event);
                },
                [inputRef, shift, toggleShift, toggleKorean, getTransformedValue],
        );

        const handlePointerDown = useCallback(
                (e: PointerEvent<HTMLButtonElement>) => {
                        e.preventDefault();
                        triggerVirtualKey(e.currentTarget);
                },
                [triggerVirtualKey],
        );

        const handleClick = useCallback(
                (e: ReactMouseEvent<HTMLButtonElement>) => {
                        if (e.detail !== 0) return;
                        triggerVirtualKey(e.currentTarget);
                },
                [triggerVirtualKey],
        );
        const keyboardMetrics = useMemo(() => {
                const maxWidth = 430;
                const baseHeight = 290;
                const bottomInset = 18;
                const width = Math.min(maxWidth, viewport.width - 12);
                const height = Math.round(baseHeight / viewport.scale);
                const left = Math.round(
                        viewport.offsetLeft + (viewport.width - width) / 2,
                );
                const desiredTop = Math.round(
                        viewport.offsetTop +
                                viewport.height -
                                (height + Math.round(bottomInset / viewport.scale)),
                );

                return {
                        width: Math.round(width),
                        height,
                        left,
                        top: Math.max(viewport.offsetTop, desiredTop),
                };
        }, [viewport.height, viewport.offsetLeft, viewport.offsetTop, viewport.scale, viewport.width]);

        if (!focusId || !isMobileAgent()) return null;
        return (
                <ShadowWrapper
                        tagName={"virtual-keypad" as "div"}
                        css={`
        :host {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .keypad-container {
          display: flex;
          flex-direction: column;
          position: fixed;
          padding: calc(18px / var(--scale-factor)) calc(14px / var(--scale-factor)) calc(28px / var(--scale-factor));
          box-sizing: border-box;
          gap: calc(14px / var(--scale-factor));
          border-radius: calc(34px / var(--scale-factor));
          border: calc(1px / var(--scale-factor)) solid rgba(255, 255, 255, 0.32);
          background:
            linear-gradient(140deg, rgba(255, 255, 255, 0.24) 0%, rgba(170, 200, 255, 0.18) 38%, rgba(120, 150, 210, 0.12) 100%);
          box-shadow:
            0 calc(26px / var(--scale-factor)) calc(68px / var(--scale-factor)) rgba(15, 23, 42, 0.38),
            inset 0 calc(1px / var(--scale-factor)) calc(0px / var(--scale-factor)) rgba(255, 255, 255, 0.52);
          backdrop-filter: blur(calc(42px / var(--scale-factor))) saturate(140%);
          user-select: none;
          touch-action: manipulation;
          overflow: hidden;
          left: 0;
        }
        .keypad-container::before {
          content: "";
          position: absolute;
          inset: calc(1px / var(--scale-factor));
          border-radius: inherit;
          background:
            linear-gradient(160deg, rgba(255, 255, 255, 0.32) 0%, rgba(255, 255, 255, 0.14) 40%, rgba(148, 163, 184, 0.08) 100%);
          mix-blend-mode: screen;
          pointer-events: none;
          opacity: 0.85;
        }
        .keypad-container::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(circle at 20% 0%, rgba(255, 255, 255, 0.35) 0%, transparent 45%),
            radial-gradient(circle at 80% 0%, rgba(156, 175, 255, 0.28) 0%, transparent 48%),
            linear-gradient(180deg, rgba(15, 23, 42, 0) 0%, rgba(15, 23, 42, 0.32) 100%);
          pointer-events: none;
          opacity: 0.65;
        }
        .keypad-content {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: calc(12px / var(--scale-factor));
        }
        .keypad-row {
          display: flex;
          gap: calc(9px / var(--scale-factor));
          width: 100%;
          justify-content: center;
        }
        .keypad-row.row-1 {
          padding: 0 calc(16px / var(--scale-factor));
        }
        .keypad-row.row-2 {
          padding: 0 calc(32px / var(--scale-factor));
        }
        .keypad-row.row-3 {
          padding: 0 calc(10px / var(--scale-factor));
        }
        .keypad-row.row-4 {
          padding: 0 calc(16px / var(--scale-factor));
          gap: calc(16px / var(--scale-factor));
        }
        @keyframes key-pop {
          from {
            opacity: 0.85;
            transform: translate(-50%, calc(6px / var(--scale-factor))) scale(1);
          }
          to {
            opacity: 1;
            transform: translate(-50%, calc(-24px / var(--scale-factor))) scale(1.32);
          }
        }
        @keyframes key-press {
          from { transform: scale(1); }
          to { transform: scale(0.94); }
        }
        .keypad-button {
          position: relative;
          flex: 1 0 0;
          min-width: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          height: calc(52px / var(--scale-factor));
          padding: 0 calc(6px / var(--scale-factor));
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(240, 246, 255, 0.6) 55%, rgba(214, 226, 255, 0.52) 100%);
          border: calc(1px / var(--scale-factor)) solid rgba(255, 255, 255, 0.58);
          border-radius: calc(18px / var(--scale-factor));
          font-size: calc(20px / var(--scale-factor));
          font-weight: 500;
          letter-spacing: 0.015em;
          color: rgba(15, 23, 42, 0.92);
          cursor: pointer;
          box-shadow:
            0 calc(16px / var(--scale-factor)) calc(22px / var(--scale-factor)) rgba(30, 41, 59, 0.18),
            inset 0 calc(1px / var(--scale-factor)) calc(0px / var(--scale-factor)) rgba(255, 255, 255, 0.85);
          transition: transform 70ms ease, box-shadow 100ms ease, background 140ms ease, color 140ms ease;
          overflow: hidden;
        }
        .keypad-button::before {
          content: "";
          position: absolute;
          inset: calc(1px / var(--scale-factor));
          border-radius: inherit;
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.16) 60%, transparent 100%),
            linear-gradient(180deg, rgba(148, 163, 184, 0.08) 0%, rgba(15, 23, 42, 0.12) 100%);
          opacity: 0.85;
          pointer-events: none;
        }
        .keypad-button::after {
          content: "";
          position: absolute;
          inset: calc(-18px / var(--scale-factor)) calc(-6px / var(--scale-factor)) calc(-26px / var(--scale-factor));
          background: radial-gradient(circle at 50% 110%, rgba(59, 130, 246, 0.28) 0%, transparent 60%);
          opacity: 0;
          transition: opacity 120ms ease;
          pointer-events: none;
        }
        .keypad-button .keycap-label {
          position: relative;
          z-index: 1;
        }
        .keypad-button:active {
          animation: key-press 0.08s forwards;
          box-shadow:
            0 calc(8px / var(--scale-factor)) calc(12px / var(--scale-factor)) rgba(30, 41, 59, 0.32),
            inset 0 calc(1px / var(--scale-factor)) calc(0px / var(--scale-factor)) rgba(255, 255, 255, 0.65);
          background: linear-gradient(180deg, rgba(225, 233, 255, 0.7) 0%, rgba(196, 210, 255, 0.58) 100%);
        }
        .keypad-button:active::after {
          opacity: 0.65;
        }
        .keypad-button.action {
          background:
            linear-gradient(180deg, rgba(209, 213, 219, 0.65) 0%, rgba(148, 163, 184, 0.52) 100%);
          color: rgba(17, 24, 39, 0.88);
        }
        .keypad-button.action::before {
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.18) 55%, transparent 100%),
            linear-gradient(180deg, rgba(71, 85, 105, 0.1) 0%, rgba(30, 41, 59, 0.16) 100%);
        }
        .keypad-button.active-modifier {
          background:
            linear-gradient(180deg, rgba(129, 140, 248, 0.78) 0%, rgba(99, 102, 241, 0.74) 40%, rgba(79, 70, 229, 0.72) 100%);
          color: rgba(241, 245, 249, 0.96);
          box-shadow:
            0 calc(18px / var(--scale-factor)) calc(28px / var(--scale-factor)) rgba(79, 70, 229, 0.38),
            inset 0 calc(1px / var(--scale-factor)) calc(0px / var(--scale-factor)) rgba(255, 255, 255, 0.55);
        }
        .keypad-button.active-modifier::before {
          background:
            radial-gradient(circle at top, rgba(255, 255, 255, 0.68) 0%, rgba(180, 191, 255, 0.22) 60%, transparent 100%),
            linear-gradient(180deg, rgba(59, 130, 246, 0.22) 0%, rgba(129, 140, 248, 0.14) 100%);
        }
        .keypad-button.active-modifier::after {
          background: radial-gradient(circle at 50% 110%, rgba(129, 140, 248, 0.5) 0%, transparent 60%);
          opacity: 0.58;
        }
        .keypad-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 calc(3px / var(--scale-factor)) rgba(129, 140, 248, 0.4);
        }
        .keypad-button .label-secondary {
          font-size: calc(12px / var(--scale-factor));
          line-height: 1;
        }
        .key-popup {
          display: none;
          position: absolute;
          left: 50%;
          bottom: 82%;
          min-width: 100%;
          padding: calc(8px / var(--scale-factor)) calc(14px / var(--scale-factor));
          background:
            linear-gradient(160deg, rgba(255, 255, 255, 0.92) 0%, rgba(210, 230, 255, 0.88) 55%, rgba(199, 210, 254, 0.82) 100%);
          color: rgba(15, 23, 42, 0.95);
          border-radius: calc(16px / var(--scale-factor));
          border: calc(1px / var(--scale-factor)) solid rgba(255, 255, 255, 0.65);
          box-shadow: 0 calc(16px / var(--scale-factor)) calc(32px / var(--scale-factor)) rgba(15, 23, 42, 0.28);
          pointer-events: none;
          font-size: calc(26px / var(--scale-factor));
          font-weight: 500;
          text-align: center;
          z-index: 10;
          line-height: 1.25;
        }
        .keypad-button:active .key-popup {
          display: block;
          animation: key-pop 0.12s ease-out forwards;
        }

      `}
                >
                        <div
                                onFocus={handleFocus}
                                onBlur={onBlur}
                                tabIndex={-1}
                                className="keypad-container"
                                style={{
                                        left: keyboardMetrics.left,
                                        width: keyboardMetrics.width,
                                        top: keyboardMetrics.top,
                                        height: keyboardMetrics.height,
                                        "--scale-factor": viewport.scale,
                                }}
                        >
                                <div className="keypad-content">
                                        {layout?.map((row, i) => (
                                                <div className={`keypad-row row-${i + 1}`} key={i}>
                                                        {row.map((cell, j) => {
                                                        const buttonClasses = ["keypad-button"];
                                                        if (cell.type === "action") {
                                                                buttonClasses.push("action");
                                                        }
                                                        if (cell.value === "Shift" && shift) {
                                                                buttonClasses.push("active-modifier");
                                                        }
                                                        if (cell.value === "HangulMode" && hangulMode) {
                                                                buttonClasses.push("active-modifier");
                                                        }

                                                        const style: CSSProperties = {};
                                                        if (cell.width) {
                                                                style.flexGrow = cell.width;
                                                                style.flexShrink = 0;
                                                                style.flexBasis = 0;
                                                        }
                                                        if (cell.height) {
                                                                style.height = `calc(${cell.height}px / var(--scale-factor))`;
                                                        }

                                                        return (
                                                                <button
                                                                        type="button"
                                                                        value={cell.value}
                                                                        data-type={cell.type}
                                                                        onPointerDown={handlePointerDown}
                                                                        onClick={handleClick}
                                                                        className={buttonClasses.join(" ")}
                                                                        style={style}
                                                                        key={`${i}-${j}`}
                                                                >
                                                                        <span className="keycap-label">{getTransformedValue(cell)}</span>
                                                                        <div className="key-popup">{getTransformedValue(cell)}</div>
                                                                </button>
                                                        );
                                                })}
                                        </div>
                                ))}
                                </div>
                        </div>
                </ShadowWrapper>
        );
}
