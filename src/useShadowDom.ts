import { useEffect, useRef } from "react";

export function useShadowDom() {
	const containerRef = useRef<HTMLElement>(null);
	const shadowRootRef = useRef<ShadowRoot>(null);

	useEffect(() => {
		if (containerRef.current && !shadowRootRef.current) {
			shadowRootRef.current = containerRef.current.atta;
		}
	}, []);
}
