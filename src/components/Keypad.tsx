import {
        useCallback,
        useEffect,
        useRef,
} from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { useVirtualInputContext } from "./Context";
import { isMobileAgent } from "../utils/isMobileAgent";
import { useKeypadLayout, type KeypadLayout, type Viewport } from "../hooks/useKeypadLayout";
import { useKeypadInteraction } from "../hooks/useKeypadInteraction";

export type { KeypadLayout, Viewport };

export function VirtualKeypad({
        layout,
        viewport,
}: {
        layout: KeypadLayout;
        viewport: Viewport;
}) {
        const {
                focusId,
                onBlur,
                onFocus,
                inputRef,
                shift,
                hangulMode,
                toggleShift,
                toggleKorean,
        } = useVirtualInputContext();

        // Canvas & Container
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        // Hooks
        const {
                keyBoundsRef,
                calculateLayout,
                getTransformedValue
        } = useKeypadLayout({
                layout,
                viewport,
                hangulMode,
                shift
        });

        const {
                activePresses,
                handlePointerDown,
                handlePointerMove,
                handlePointerUp,
                handlePointerCancel
        } = useKeypadInteraction({
                inputRef,
                toggleShift,
                toggleKorean,
                shift,
                getTransformedValue,
                keyBoundsRef
        });


        // --- Layout & Rendering ---

        const drawKey = (
                ctx: CanvasRenderingContext2D,
                key: { x: number; y: number; w: number; h: number; value: string; label: string; isAction: boolean; type?: string },
                isPressed: boolean,
                isActiveModifier: boolean,
                scale: number
        ) => {
                const r = 8 / scale; // Rounded corners
                const { x, y, w, h } = key;

                // Colors
                const colors = {
                        bg: "#d1d5db", // Page bg
                        keyBg: isPressed ? "#E5E7EB" : "#FFFFFF",
                        keyShadow: "#899499",
                        text: "#111827",
                        actionBg: isPressed ? "#cbd5e1" : "#e2e8f0", // slate-300 / slate-200
                        activeModBg: isPressed ? "#bfdbfe" : "#dbeafe", // blue-200 / blue-100
                        activeModText: "#1d4ed8",
                };

                if (key.isAction) {
                        colors.keyBg = colors.actionBg;
                }
                if (isActiveModifier) {
                        colors.keyBg = colors.activeModBg;
                }

                // Shadow (3D effect)
                ctx.fillStyle = colors.keyShadow;
                roundRect(ctx, x, y + (1 / scale), w, h, r);
                ctx.fill();

                // Key Face
                // When pressed, translate down slightly to simulate depth
                const pressOffset = isPressed ? (1 / scale) : 0;
                const shadowOffset = isPressed ? 0 : (2 / scale);

                ctx.fillStyle = colors.keyBg;
                // We draw the key face slightly higher than the shadow
                roundRect(ctx, x, y + pressOffset, w, h - shadowOffset, r);
                ctx.fill();

                // Text
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                let fontSize = 20 / scale;
                if (key.label.length > 1) fontSize = 16 / scale; // Smaller for "Enter", "Shift"

                ctx.font = `500 ${fontSize}px "Inter", "system-ui", sans-serif`;

                if (isActiveModifier) {
                        ctx.fillStyle = colors.activeModText;
                } else {
                        ctx.fillStyle = colors.text;
                }

                ctx.fillText(key.label, x + w / 2, y + (h - shadowOffset) / 2 + pressOffset + (1 / scale)); // +1 for visual centering
        };

        const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
        };
        const draw = useCallback(() => {
                const canvas = canvasRef.current;
                if (!canvas) return;
                const ctx = canvas.getContext("2d", { alpha: false }); // Optimize
                if (!ctx) return;

                // Resize check
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                if (Math.abs(canvas.width - rect.width * dpr) > 1 || Math.abs(canvas.height - rect.height * dpr) > 1) {
                        canvas.width = rect.width * dpr;
                        canvas.height = rect.height * dpr;
                        ctx.scale(dpr, dpr);
                        // Update layout on resize if needed
                        keyBoundsRef.current = calculateLayout();
                }

                // If layout empty, calc
                if (keyBoundsRef.current.length === 0) {
                        keyBoundsRef.current = calculateLayout();
                }

                const width = rect.width;
                const height = rect.height;

                // Background
                ctx.fillStyle = "#d1d5db"; // Tailwind Gray 300
                ctx.fillRect(0, 0, width, height);

                const scale = viewport.scale; // use for font scaling

                // Draw keys
                keyBoundsRef.current.forEach(key => {
                        // Check active state
                        let isPressed = false;
                        for (const press of activePresses.current.values()) {
                                // Using loose match for better responsiveness on edges if needed
                                // But strict index match is safest for visuals
                                const keyIndex = key.rowIndex * 100 + key.colIndex;
                                if (press.keyIndex === keyIndex) {
                                        isPressed = true;
                                        break;
                                }
                        }
                        // Modifiers active state
                        const isActiveModifier = (key.value === "Shift" && shift) || (key.value === "HangulMode" && hangulMode);

                        drawKey(ctx, key, isPressed, isActiveModifier, scale);
                });
        }, [calculateLayout, hangulMode, shift, viewport.scale, activePresses, keyBoundsRef]); // Added deps



        // --- Interactions ---

        // Explicitly reset layout on mode change to force redraw
        useEffect(() => {
                keyBoundsRef.current = [];
        }, [hangulMode, shift, keyBoundsRef]);

        // Outside Click / PointerDown Handler
        useEffect(() => {
                const handleGlobalPointerDown = (e: PointerEvent) => {
                        if (!containerRef.current || !focusId) return;

                        // Check if target is inside keypad
                        // Since we use Shadow DOM, we must check composedPath
                        const path = e.composedPath();
                        if (path.includes(containerRef.current)) {
                                return;
                        }

                        // Check if target is inside the Virtual Input
                        // Scan path for data-virtual-input
                        const isInput = path.some(node => {
                                return node instanceof Element && node.getAttribute("data-virtual-input") === "true";
                        });

                        if (isInput) return;

                        // If click is outside Keypad AND outside Input, we blur.
                        onBlur(true);
                };

                // Use 'true' for capture to ensure we catch the event even if propagation is stopped
                window.addEventListener("pointerdown", handleGlobalPointerDown, { capture: true });
                return () => {
                        window.removeEventListener("pointerdown", handleGlobalPointerDown, { capture: true });
                };
        }, [focusId, onBlur]);

        // Animation Loop for smooth pressing

        useEffect(() => {
                let handle: number;
                const loop = () => {
                        draw();
                        handle = requestAnimationFrame(loop);
                };
                loop();
                return () => cancelAnimationFrame(handle);
        }, [draw]);


        if (!focusId || !isMobileAgent()) return null;

        return (
                <ShadowWrapper
                        tagName={"virtual-keypad-canvas" as "div"}
                        css={`
               .keypad-wrapper {
                   position: fixed;
                   background-color: #d1d5db;
                   border-radius: calc(18px / var(--scale-factor));
                   box-shadow: 0 calc(-6px / var(--scale-factor)) calc(30px / var(--scale-factor)) rgba(15, 23, 42, 0.2);
                   user-select: none;
                   -webkit-user-select: none;
                   touch-action: none; /* Critical for iOS */
                   -webkit-touch-callout: none; /* Disable magnifier/menu */
                   -webkit-tap-highlight-color: transparent; /* No gray tap box */
                   z-index: 9999;
                   overflow: hidden; /* Canvas containment */
               }
               canvas {
                   display: block;
                   width: 100%;
                   height: 100%;
                   touch-action: none; /* Extra safety */
               }
            `}
                >
                        <div
                                ref={containerRef}
                                className="keypad-wrapper"
                                onFocus={() => { if (focusId) onFocus(focusId) }}
                                onBlur={onBlur}
                                onContextMenu={(e) => e.preventDefault()}
                                onPointerDown={(e) => e.preventDefault()} // Prevent focus loss on background tap
                                onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }} // Stop Ghost Clicks
                                style={{
                                        left: viewport.offsetLeft,
                                        width: viewport.width,
                                        top: Math.round(
                                                viewport.offsetTop + viewport.height - 200 / viewport.scale,
                                        ),
                                        height: Math.round(200 / viewport.scale),

                                        "--scale-factor": viewport.scale,
                                } as React.CSSProperties}
                        >
                                <canvas
                                        ref={canvasRef}
                                        onPointerDown={handlePointerDown}
                                        onPointerMove={handlePointerMove}
                                        onPointerUp={handlePointerUp}
                                        onPointerLeave={handlePointerUp}
                                        onPointerCancel={handlePointerCancel}
                                />
                        </div>
                </ShadowWrapper>
        );
}
