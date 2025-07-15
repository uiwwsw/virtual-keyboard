/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import { useVirtualInputContext } from "./Context";
import { useCallback, type MouseEvent } from "react";
import LAYOUT from "../assets/layout.json";
import { useStorage } from "../hooks/useStorage";
import { ShadowWrapper } from "./ShadowWrapper";

export type VirtualKeypadName = "QWERTY" | "QWERTYKO";
export function VirtualKeypad({
	defaultLayout,
}: {
	defaultLayout?: VirtualKeypadName;
}) {
	const [layout, setLayout] = useStorage(
		"virtual-keyboard-layout",
		defaultLayout,
	);
	const { focusId, onBlur, onFocus, inputRef, shiftRef, toggleShift } = useVirtualInputContext();

	const handleFocus = useCallback(() => {
		if (!focusId) return;
		onFocus(focusId);
	}, [onFocus, focusId]);
	const insertCharacter = useCallback(
		(e: MouseEvent<HTMLButtonElement>) => {
			const target = e.target;
			if (!(target instanceof HTMLButtonElement)) return;

			const value = target.value;

			if (value === "Shift") {
				toggleShift();
				return;
			}

			const event = new KeyboardEvent("keydown", {
				key: value,
				code: `Key${value.toUpperCase()}`,
				bubbles: true,
				cancelable: true,
				shiftKey: shiftRef.current,
			});
			inputRef.current?.handleKeyDown(event);
			const layout = target.dataset.layout;
			if (layout) setLayout(layout as VirtualKeypadName);
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
							{row.map((cell, j) => (
								<button
									type="button"
									value={cell.value}
									data-layout={cell.layout}
									onClick={insertCharacter}
									style={{ flex: 1 }}
									key={`${i}-${j}`}
								>
									{cell.label === "Shift" ? (
										shiftRef.current ? (
											"SHIFT"
										) : (
											"Shift"
										)
									) : (
										cell.label
									)}
								</button>
							))}
						</div>
					))}
			</div>
		</ShadowWrapper>
	);
}
