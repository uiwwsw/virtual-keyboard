/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useVirtualInputContext } from "./Context";
import { useCallback, type MouseEvent } from "react";
import LAYOUT from "../assets/layout.json";
import { useStorage } from "../hooks/useStorage";
import { ShadowWrapper } from "./ShadowWrapper";
import { convertQwertyToHangul } from "es-hangul";

export type VirtualKeypadName = "QWERTY";
export function VirtualKeypad({
	defaultLayout,
}: {
	defaultLayout?: VirtualKeypadName;
}) {
	const [layout, setLayout] = useStorage(
		"virtual-keyboard-layout",
		defaultLayout,
	);
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
		<ShadowWrapper tagName={"virtual-keypad" as "div"}>
			<div
				onFocus={handleFocus}
				onBlur={onBlur}
				tabIndex={-1}
				style={{
					position: "fixed",
					left: 0,
					right: 0,
					bottom: 0,
					height: 200,
					background: "gray",
				}}
			>
				{layout &&
					LAYOUT[layout]?.map((row, i) => (
						<div
							style={{
								display: "flex",
							}}
							key={i}
						>
							{row.map((cell, j) => (
								<button
									type="button"
									value={cell.value}
									data-type={cell.type}
									onClick={insertCharacter}
									style={{ flex: 1 }}
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
