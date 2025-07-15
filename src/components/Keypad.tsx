/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useVirtualInputContext } from "./Context";
import { useCallback, type MouseEvent } from "react";
import LAYOUT from "../assets/layout.json";
import { useStorage } from "../hooks/useStorage";
import { ShadowWrapper } from "./ShadowWrapper";

export type VirtualKeypadName = "newqwerty";

export function VirtualKeypad({
	defaultLayout,
}: {
	defaultLayout?: VirtualKeypadName;
}) {
	const [layout, setLayout] = useStorage(
		"virtual-keyboard-layout",
		defaultLayout,
	);
	const { focusId, onBlur, onFocus, inputRef, shiftRef, toggleShift, hangulMode } = useVirtualInputContext();

	const handleFocus = useCallback(() => {
		if (!focusId) return;
		onFocus(focusId);
	}, [onFocus, focusId]);
	const insertCharacter = useCallback(
		(e: MouseEvent<HTMLButtonElement>) => {
			const target = e.target;
			if (!(target instanceof HTMLButtonElement)) return;

			const cellValue = target.value;
			const cellCode = target.dataset.code;

			if (cellValue === "Shift") {
				toggleShift();
				return;
			}

			const event = new KeyboardEvent("keydown", {
				key: cellValue,
				code: cellCode,
				bubbles: true,
				cancelable: true,
				shiftKey: shiftRef.current,
			});
			inputRef.current?.handleKeyDown(event);
			const layoutAttr = target.dataset.layout;
			if (layoutAttr) setLayout(layoutAttr as VirtualKeypadName);
		}, [inputRef, setLayout, shiftRef, toggleShift],
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
							{row.map((cell, j) => {
								let displayLabel = "";
								let keyValue = "";
								const isSpecialKey = cell.special !== undefined;

								if (isSpecialKey) {
									displayLabel = cell.special.label;
									keyValue = cell.special.value;
									if (cell.code === "HangulMode") {
										displayLabel = hangulMode ? "ENG" : "한/영";
									}
									if (cell.code === "ShiftLeft") {
										displayLabel = shiftRef.current ? "SHIFT" : "Shift";
									}
								} else if (hangulMode) {
									displayLabel = shiftRef.current ? cell.ko.shifted.label : cell.ko.normal.label;
									keyValue = shiftRef.current ? cell.ko.shifted.value : cell.ko.normal.value;
								} else {
									displayLabel = shiftRef.current ? cell.en.shifted.label : cell.en.normal.label;
									keyValue = shiftRef.current ? cell.en.shifted.value : cell.en.normal.value;
								}

								return (
									<button
										type="button"
										value={keyValue}
										data-code={cell.code}
										onClick={insertCharacter}
										style={{ flex: 1 }}
										key={`${i}-${j}`}
									>
										{displayLabel}
									</button>
								);
							})}
						</div>
					))}
			</div>
		</ShadowWrapper>
	);
}
