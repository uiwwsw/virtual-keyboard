import { isMobileAgent } from "../utils/isMobileAgent";

export function Keyboard({ focus }: { focus?: boolean }) {
	if (!focus || !isMobileAgent()) return null;
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
		></div>
	);
}
