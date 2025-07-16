import { useState, useEffect } from "react";

const getVisualViewport = () => {
	if (typeof window !== "undefined" && window.visualViewport) {
		return {
			width: window.visualViewport.width,
			height: window.visualViewport.height,
			scale: window.visualViewport.scale,
			offsetLeft: window.visualViewport.offsetLeft,
			offsetTop: window.visualViewport.offsetTop,
		};
	}
	return {
		width: window.innerWidth,
		height: window.innerHeight,
		scale: 1,
		offsetLeft: 0,
		offsetTop: 0,
	};
};

export const useVisualViewport = () => {
	const [viewport, setViewport] = useState(getVisualViewport);

	useEffect(() => {
		const handleResize = () => {
			setViewport(getVisualViewport());
		};

		if (typeof window !== "undefined" && window.visualViewport) {
			window.visualViewport.addEventListener("resize", handleResize);
			window.visualViewport.addEventListener("scroll", handleResize);
			return () => {
				window.visualViewport?.removeEventListener("resize", handleResize);
				window.visualViewport?.removeEventListener("scroll", handleResize);
			};
		}

		// Fallback for older browsers
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	return viewport;
};
