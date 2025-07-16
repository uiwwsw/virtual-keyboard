/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
/** biome-ignore-all assist/source/organizeImports: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/noStaticElementInteractions: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useVirtualInputContext } from "./Context";
import { useCallback, type MouseEvent } from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { convertQwertyToHangul } from "es-hangul";
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

	const insertCharacter = useCallback(
		(e: MouseEvent<HTMLButtonElement>) => {
			const target = e.target;
			if (!(target instanceof HTMLButtonElement)) return;

			const { value, dataset } = target;
			const type = dataset.type as "char" | "action";

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
          background-color: #f0f2f5;
          padding: 8px;
          box-sizing: border-box;
          gap: 8px;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          user-select: none;
        }
        .keypad-row {
          display: flex;
          flex: 1;
          gap: 8px;
        }
        .keypad-button {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          background-color: #ffffff;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          box-shadow: 0 2px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.1s ease-in-out;
        }
        .keypad-button:active {
          background-color: #e0e0e0;
          transform: scale(0.98);
          box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
        }
        .keypad-button.action {
            background-color: #d1d5db;
        }
        .keypad-button.action:active {
            background-color: #b0b5bE;
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
					top: viewport.offsetTop + viewport.height - 200 / viewport.scale,
					height: 200 / viewport.scale,
				}}
			>
				{layout?.map((row, i) => (
					<div className="keypad-row" key={i}>
						{row.map((cell, j) => (
							<button
								type="button"
								value={cell.value}
								data-type={cell.type}
								onClick={insertCharacter}
								className={`keypad-button ${cell.type === 'action' ? 'action' : ''}`}
								key={`${i}-${j}`}
							>
								{getTransformedValue(cell)}
							</button>
						))}
					</div>
				))}
			</div>
		</ShadowWrapper>
	);
}