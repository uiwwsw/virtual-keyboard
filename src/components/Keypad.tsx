/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
/** biome-ignore-all assist/source/organizeImports: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useVirtualInputContext } from "./Context";
import { useCallback, type MouseEvent, type CSSProperties } from "react";
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
                                const isConvertibleHangulSource =
                                        hangulMode && /[a-zA-Z]/.test(cell.value) && cell.value.length === 1;

                                if (isConvertibleHangulSource) {
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

        const insertCharacter = useCallback(
                (e: MouseEvent<HTMLButtonElement>) => {
                        const target = e.target;
                        if (!(target instanceof HTMLButtonElement)) return;

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
	if (!focusId || !isMobileAgent()) return null;
        return (
                <ShadowWrapper
                        tagName={"virtual-keypad" as "div"}
                        css={`
        .keypad-container {
          display: flex;
          flex-direction: column;
          position: fixed;
          background-color: #e8eaee;
          padding: calc(12px / var(--scale-factor));
          box-sizing: border-box;
          gap: calc(10px / var(--scale-factor));
          border-radius: calc(18px / var(--scale-factor));
          box-shadow: 0 calc(-6px / var(--scale-factor)) calc(30px / var(--scale-factor)) rgba(15, 23, 42, 0.2);
          user-select: none;
          touch-action: manipulation;
          z-index: 9999;
        }
        .keypad-row {
          display: flex;
          flex: 1;
          gap: calc(10px / var(--scale-factor));
        }
        @keyframes key-pop {
          from {
            opacity: 0.9;
            transform: translate(-50%, 5px) scale(1);
          }
          to {
            opacity: 1;
            transform: translate(-50%, calc(-15px / var(--scale-factor))) scale(1.4);
          }
        }
        @keyframes key-press {
          from { transform: scale(1); }
          to { transform: scale(0.96); }
        }
        .keypad-button {
          position: relative;
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, #dfe3eb 100%);
          border: calc(1px / var(--scale-factor)) solid rgba(148, 163, 184, 0.7);
          border-radius: calc(12px / var(--scale-factor));
          font-size: calc(18px / var(--scale-factor));
          font-weight: 600;
          letter-spacing: 0.01em;
          color: #1f2933;
          cursor: pointer;
          box-shadow:
            0 calc(2px / var(--scale-factor)) calc(4px / var(--scale-factor)) rgba(15, 23, 42, 0.12),
            inset 0 calc(1px / var(--scale-factor)) calc(1px / var(--scale-factor)) rgba(255, 255, 255, 0.65);
          transition: transform 80ms ease, box-shadow 80ms ease, background 120ms ease;
        }
        .keypad-button:active {
          animation: key-press 0.05s forwards;
          box-shadow: 0 calc(1px / var(--scale-factor)) calc(2px / var(--scale-factor)) rgba(15, 23, 42, 0.18);
          background: linear-gradient(180deg, rgba(248, 249, 251, 0.95) 0%, #c9d2df 100%);
        }
        .key-popup {
          display: none;
          position: absolute;
          left: 50%;
          bottom: 80%;
          min-width: 100%;
          padding: calc(8px / var(--scale-factor)) calc(12px / var(--scale-factor));
          background-color: rgba(248, 250, 252, 0.98);
          color: #0f172a;
          border-radius: calc(10px / var(--scale-factor));
          box-shadow: 0 calc(-4px / var(--scale-factor)) calc(18px / var(--scale-factor)) rgba(15, 23, 42, 0.18);
          pointer-events: none;
          touch-action: none;
          user-select: none;
          font-size: calc(26px / var(--scale-factor));
          font-weight: 500;
          text-align: center;
          z-index: 10;
          line-height: 1.2;
        }
        .keypad-button:active .key-popup {
          display: block;
          animation: key-pop 0.1s ease-out forwards;
        }
        .keypad-button.action {
          background: linear-gradient(180deg, #f8fafc 0%, #cbd5f5 100%);
          color: #1e3a8a;
          border-color: rgba(59, 130, 246, 0.55);
        }
        .keypad-button.active-modifier {
          background: linear-gradient(180deg, #e0ecff 0%, #99b7ff 100%);
          color: #1e3a8a;
          box-shadow:
            0 calc(3px / var(--scale-factor)) calc(6px / var(--scale-factor)) rgba(37, 99, 235, 0.25),
            inset 0 calc(1px / var(--scale-factor)) calc(1px / var(--scale-factor)) rgba(255, 255, 255, 0.55);
        }
        .keypad-button:focus-visible {
          outline: none;
          box-shadow: 0 0 0 calc(3px / var(--scale-factor)) rgba(59, 130, 246, 0.35);
        }

      `}
                >
                        <div
                                onFocus={handleFocus}
				onBlur={onBlur}
				tabIndex={-1}
				className="keypad-container"
				style={{
					left: viewport.offsetLeft,
					width: viewport.width,
					top: Math.round(
						viewport.offsetTop + viewport.height - 200 / viewport.scale,
					),
					height: Math.round(200 / viewport.scale),
					"--scale-factor": viewport.scale,
				}}
			>
                                {layout?.map((row, i) => (
                                        <div className="keypad-row" key={i}>
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
                                                                style.flex = `${cell.width} 0 0`;
                                                        }
                                                        if (cell.height) {
                                                                style.height = `calc(${cell.height}px / var(--scale-factor))`;
                                                        }

                                                        return (
                                                        <button
                                                                type="button"
                                                                value={cell.value}
                                                                data-type={cell.type}
                                                                onClick={insertCharacter}
                                                                className={buttonClasses.join(" ")}
                                                                style={style}
                                                                key={`${i}-${j}`}
                                                        >
                                                                {getTransformedValue(cell)}
                                                                <div className="key-popup">{getTransformedValue(cell)}</div>
                                                        </button>
                                                );
                                                })}
                                        </div>
                                ))}
			</div>
		</ShadowWrapper>
	);
}
