/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import qwerty from "../assets/qwerty.json";
import { useEffect, useState } from "react";
export function Keyboard({
	focus,
	onInput,
}: {
	focus?: boolean;
	onInput: (value: string) => unknown;
}) {
	const [active, setActive] = useState(false);
	const handleInput = (value: string) => {
		if (onInput) {
			onInput(value); // 외부로 값 전달
		} else {
			console.log("Pressed:", value); // 기본 동작 (디버그용)
		}
	};
	useEffect(() => {
		if (focus) setActive(true);
	}, [focus]);
	useEffect(() => {
		const test = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			if (target.tagName === "VIRTUAL-KEYBOARD") return;
			setActive(false);
		};
		document.addEventListener("click", test);
		return () => {
			document.removeEventListener("click", test);
		};
	}, []);
	if (!active || !isMobileAgent()) return null;

	return (
		<div
			style={{
				position: "fixed",
				left: 0,
				right: 0,
				bottom: 0,
				height: 200,
				background: "gray",
			}}
		>
			{qwerty.rows.map((row, i) => (
				<div
					style={{
						display: "flex",
					}}
					key={i}
				>
					{row.map((cell, j) => (
						<button
							type="button"
							onClick={() => handleInput(cell.value)}
							style={{ flex: 1 }}
							key={`${i}-${j}`}
						>
							{cell.label}
						</button>
					))}
				</div>
			))}
		</div>
	);
}
