import { useEffect, useRef, useState } from "react";
import { BlinkingCaret } from "./BlinkingCaret";

export function Test() {
	const ref = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{ left: number; top: number }>({
		left: 0,
		top: 0,
	});
	useEffect(() => {
		function getCharOffsetPosition(
			container: HTMLDivElement,
			charIndex: number,
		): DOMRect | null {
			const textNode = getFirstTextNode(container);
			if (!textNode) return null;

			const range = document.createRange();

			// 해당 글자 인덱스까지 Range 설정
			range.setStart(textNode, charIndex);
			range.setEnd(textNode, charIndex + 1);

			const rect = range.getBoundingClientRect();
			return rect;
		}

		function getFirstTextNode(el: HTMLElement): Text | null {
			const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
			return walker.nextNode() as Text | null;
		}
		if (ref.current) {
			const rect = getCharOffsetPosition(ref.current, 2); // "안녕하..."
			if (rect) {
				setPosition({ left: rect.left, top: rect.top });
				console.log("3번째 글자의 위치", rect.left, rect.top);
			}
		}
	}, []);
	return (
		<div ref={ref} style={{ position: "relative" }}>
			djkjwa dwadawa 11
			<BlinkingCaret {...position} />
		</div>
	);
}
