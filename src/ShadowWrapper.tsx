import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

/**
 * @description 자식 요소를 Shadow DOM에 렌더링하는 컴포넌트
 * @param children 렌더링할 React 노드
 * @returns Shadow DOM 안에 children을 렌더링
 */
export function ShadowWrapper({
	children,
	css,
}: {
	children: React.ReactNode;
	css?: string; // 스타일을 문자열로 받아서 <style>로 삽입
}) {
	const [host, hostRef] = useState<HTMLDivElement | null>(null);
	const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

	useEffect(() => {
		if (host && !shadowRoot) {
			const shadow = host.attachShadow({ mode: "open" });
			setShadowRoot(shadow);
		}
	}, [shadowRoot, host]);

	// 스타일 태그 삽입
	useEffect(() => {
		if (shadowRoot && css) {
			const styleTag = document.createElement("style");
			styleTag.textContent = css;
			shadowRoot.appendChild(styleTag);
		}
	}, [shadowRoot, css]);

	return (
		<div ref={hostRef}>
			{shadowRoot && ReactDOM.createPortal(children, shadowRoot)}
		</div>
	);
}
