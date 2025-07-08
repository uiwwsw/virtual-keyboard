/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
import { isMobileAgent } from "../utils/isMobileAgent";
import qwerty from "../assets/qwerty.json";
export function Keyboard({
	focus,
	onInput,
	onFocus,
	onBlur,
}: {
	focus?: boolean;
	onInput: (value: string) => unknown;
	onFocus: () => unknown;
	onBlur: () => unknown;
}) {
	if (!focus || !isMobileAgent()) return null;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: <explanation>
		<div
			data-virtual-keyboard="true"
			onFocus={onFocus}
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
							onClick={() => onInput(cell.value)}
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
