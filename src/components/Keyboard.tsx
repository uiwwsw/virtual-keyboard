import { isMobileAgent } from "../utils/isMobileAgent";
import qwerty from "../assets/qwerty.json";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useOutsideClickEffect } from "@toss/react";
export function Keyboard({
	focus,
	wrapEl,
}: {
	focus?: boolean;
	wrapEl: HTMLDivElement | null;
}) {
	const [active, setActive] = useState(false);
	const [wrapperEl, setWrapperEl] = useState<HTMLDivElement | null>(null);
	useEffect(() => {
		if (focus) setActive(true);
	}, [focus]);
	useOutsideClickEffect([wrapperEl, wrapEl], () => {
		if (!focus) setActive(false);
	});
	if (!active || !isMobileAgent()) return null;

	return (
		<div
			ref={setWrapperEl}
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
