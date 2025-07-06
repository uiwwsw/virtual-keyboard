import { isMobileAgent } from "../utils/isMobileAgent";
import qwerty from "../assets/qwerty.json";
export function Keyboard({ focus }: { focus?: boolean }) {
	if (!focus || !isMobileAgent()) return null;
	console.log(qwerty);
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
						<span style={{ flex: 1 }} key={`${i}-${j}`}>
							{cell.label}
						</span>
					))}
				</div>
			))}
		</div>
	);
}
