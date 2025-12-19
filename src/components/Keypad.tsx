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
                theme,
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

        // --- Layout & Rendering ---

        const drawKey = (
                ctx: CanvasRenderingContext2D,
                key: { x: number; y: number; w: number; h: number; value: string; label: string; isAction: boolean; type?: string },
                isPressed: boolean,
                isActiveModifier: boolean,
                scale: number,
                currentTheme: "light" | "dark"
        ) => {
                const r = 10 / scale; // More rounded (squircle-ish)
                const { x, y, w, h } = key;

                // --- Color Palettes ---
                const colors = currentTheme === "dark"
                        ? {
                                // DARK THEME (Inspired by reference image)
                                shadow: "#0f172a", // Deep slate shadow
                                keyFace: isPressed ? "#334155" : "#1e293b", // Slate-700 pressed / Slate-800 normal
                                text: "#f8fafc", // Slate-50 (White-ish)
                                actionFace: isPressed ? "#475569" : "#334155", // Lighter slate for actions
                                activeModFace: isPressed ? "#f8fafc" : "#e2e8f0", // Light when active
                                activeModText: "#0f172a", // Dark text when active
                        }
                        : {
                                // LIGHT THEME
                                shadow: "#cbd5e1", // Slate-300 shadow
                                keyFace: isPressed ? "#f1f5f9" : "#ffffff", // Slate-100 pressed / White normal
                                text: "#1e293b", // Slate-800
                                actionFace: isPressed ? "#e2e8f0" : "#f1f5f9", // Very light gray
                                activeModFace: isPressed ? "#bfdbfe" : "#dbeafe", // Blue hint
                                activeModText: "#1d4ed8",
                        };

                let faceColor = colors.keyFace;
                let textColor = colors.text;

                if (key.isAction) {
                        faceColor = colors.actionFace;
                }
                if (isActiveModifier) {
                        faceColor = colors.activeModFace;
                        textColor = colors.activeModText;
                }

                // --- 3D / Depth Logic ---
                // We simulate depth by drawing the shadow lower, and the face higher.
                // When pressed, the face moves down towards the shadow.

                const depth = 4 / scale; // Maximum depth (shadow height)
                const pressOffset = isPressed ? depth * 0.6 : 0; // Move down when pressed

                // 1. Draw Shadow (Base)
                ctx.fillStyle = colors.shadow;
                // Shadow is fixed at the bottom
                roundRect(ctx, x, y + depth, w, h, r);
                ctx.fill();

                // 2. Draw Key Face (Floating)
                // y position = original y + pressOffset.
                // Height is same as shadow rect? Visual trick:
                // We actually want the face to cover the top part of the shadow.
                // Let's just draw the face rect at the animated position.

                ctx.fillStyle = faceColor;
                roundRect(ctx, x, y + pressOffset, w, h, r);
                ctx.fill();

                // 3. Text
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                let fontSize = 20 / scale;
                if (key.label.length > 1) fontSize = 16 / scale;
                const fontFamily = currentTheme === "dark" ? "Inter, system-ui, sans-serif" : "Inter, system-ui, sans-serif";
                ctx.font = `500 ${fontSize}px "${fontFamily}"`;
                ctx.fillStyle = textColor;

                // Center text on the FACE (moved by pressOffset)
                ctx.fillText(key.label, x + w / 2, y + h / 2 + pressOffset);
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
                const ctx = canvas.getContext("2d", { alpha: false });
                if (!ctx) return;

                // Resize check
                const dpr = window.devicePixelRatio || 1;
                const rect = canvas.getBoundingClientRect();
                if (Math.abs(canvas.width - rect.width * dpr) > 1 || Math.abs(canvas.height - rect.height * dpr) > 1) {
                        canvas.width = rect.width * dpr;
                        canvas.height = rect.height * dpr;
                        ctx.scale(dpr, dpr);
                        keyBoundsRef.current = calculateLayout();
                }

                if (keyBoundsRef.current.length === 0) {
                        keyBoundsRef.current = calculateLayout();
                }

                const width = rect.width;
                const height = rect.height;

                // Background Theme Color
                const bgColors = {
                        dark: "#0f172a", // Slate-950 (Dark background from image)
                        light: "#e2e8f0", // Slate-200 (Light background)
                };
                ctx.fillStyle = bgColors[theme] || bgColors.light;
                ctx.fillRect(0, 0, width, height);

                const scale = viewport.scale;

                // Draw keys
                keyBoundsRef.current.forEach(key => {
                        let isPressed = false;
                        for (const press of activePresses.current.values()) {
                                const keyIndex = key.rowIndex * 100 + key.colIndex;
                                if (press.keyIndex === keyIndex) {
                                        isPressed = true;
                                        break;
                                }
                        }
                        const isActiveModifier = (key.value === "Shift" && shift) || (key.value === "HangulMode" && hangulMode);

                        drawKey(ctx, key, isPressed, isActiveModifier, scale, theme);
                });
        }, [calculateLayout, hangulMode, shift, viewport.scale, activePresses, keyBoundsRef, theme]);



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
                   background-color: var(--keypad-bg);
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
                                        "--keypad-bg": theme === "dark" ? "#0f172a" : "#e2e8f0",
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
