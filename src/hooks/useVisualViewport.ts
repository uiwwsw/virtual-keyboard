import { useEffect, useState } from "react";

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

const isSameViewport = (
        prev: ReturnType<typeof getVisualViewport>,
        next: ReturnType<typeof getVisualViewport>,
) =>
        prev.width === next.width &&
        prev.height === next.height &&
        prev.scale === next.scale &&
        prev.offsetLeft === next.offsetLeft &&
        prev.offsetTop === next.offsetTop;

export const useVisualViewport = () => {
        const [viewport, setViewport] = useState(getVisualViewport);

        useEffect(() => {
                if (typeof window === "undefined") return;

                let rafId: number | null = null;

                const applyViewportUpdate = () => {
                        const nextViewport = getVisualViewport();
                        setViewport((prev) => (isSameViewport(prev, nextViewport) ? prev : nextViewport));
                };

                const handleResize = () => {
                        if (rafId !== null) {
                                cancelAnimationFrame(rafId);
                        }
                        rafId = requestAnimationFrame(applyViewportUpdate);
                };

                if (window.visualViewport) {
                        window.visualViewport.addEventListener("resize", handleResize, { passive: true });
                        window.visualViewport.addEventListener("scroll", handleResize, { passive: true });
                } else {
                        // Fallback for older browsers
                        window.addEventListener("resize", handleResize, { passive: true });
                }

                return () => {
                        if (rafId !== null) {
                                cancelAnimationFrame(rafId);
                        }
                        if (window.visualViewport) {
                                window.visualViewport.removeEventListener("resize", handleResize);
                                window.visualViewport.removeEventListener("scroll", handleResize);
                        } else {
                                window.removeEventListener("resize", handleResize);
                        }
                };
        }, []);

        return viewport;
};
