import { useEffect, useRef, useState } from "react";

/**
 * @description Shadow DOM이 붙은 container를 반환하는 React hook
 * @returns containerRef: ShadowRoot가 붙은 div
 * @returns shadowRoot: 생성된 ShadowRoot 인스턴스
 */
export function useShadowDom<T extends HTMLElement>() {
	const [container, containerRef] = useState<T | null>();
	const shadowRootRef = useRef<ShadowRoot | null>(null);

	useEffect(() => {
		if (container && !shadowRootRef.current) {
			shadowRootRef.current = container.attachShadow({
				mode: "open",
			});
			// shadowRootRef.current.append
		}
	}, [container]);

	return { containerRef, shadowRoot: shadowRootRef.current };
}
