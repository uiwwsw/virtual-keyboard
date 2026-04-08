import { useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
                shiftLocked,
                selectionMode,
                selectionAdjusting,
                hangulMode,
                toggleShift,
                consumeShift,
                enterSelectionMode,
                exitSelectionMode,
                toggleSelectionAdjust,
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
                consumeShift,
                toggleKorean,
                enterSelectionMode,
                exitSelectionMode,
                toggleSelectionAdjust,
                selectionAdjusting,
                shift,
                shiftLocked,
                getTransformedValue,
                keyBoundsRef,
                calculateLayout,
        });


        // --- Layout & Rendering ---

        // --- Layout & Rendering ---

        const roundRect = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.arcTo(x + w, y, x + w, y + h, r);
                ctx.arcTo(x + w, y + h, x, y + h, r);
                ctx.arcTo(x, y + h, x, y, r);
                ctx.arcTo(x, y, x + w, y, r);
                ctx.closePath();
        }, []);

        const drawKey = useCallback((
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

                const depth = 4 / scale;
                const pressOffset = isPressed ? depth * 0.6 : 0;

                ctx.fillStyle = colors.shadow;
                roundRect(ctx, x, y + depth, w, h, r);
                ctx.fill();

                ctx.fillStyle = faceColor;
                roundRect(ctx, x, y + pressOffset, w, h, r);
                ctx.fill();

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                let fontSize = 20 / scale;
                if (key.label.length > 1) fontSize = 16 / scale;
                const fontFamily = currentTheme === "dark" ? "Inter, system-ui, sans-serif" : "Inter, system-ui, sans-serif";
                ctx.font = `500 ${fontSize}px "${fontFamily}"`;
                ctx.fillStyle = textColor;

                ctx.fillText(key.label, x + w / 2, y + h / 2 + pressOffset);
        }, [roundRect]);

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
                        const isActiveModifier =
                                (key.value === "Shift" && (shift || shiftLocked)) ||
                                (key.value === "HangulMode" && hangulMode) ||
                                (key.value === "EnterSelectionMode" && selectionMode) ||
                                (key.value === "ToggleSelectionAdjust" && selectionAdjusting);

                        drawKey(ctx, key, isPressed, isActiveModifier, scale, theme);
                });
        }, [calculateLayout, drawKey, hangulMode, selectionAdjusting, selectionMode, shift, shiftLocked, viewport.scale, activePresses, keyBoundsRef, theme]);



        // --- Interactions ---

        // Explicitly reset layout on mode change to force redraw
        useEffect(() => {
                keyBoundsRef.current = [];
        }, [hangulMode, shift, selectionMode, selectionAdjusting, layout, keyBoundsRef]);

        // Outside tap closes keypad; drags/scrolls keep it open
        const outsideTapRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
        useEffect(() => {
                const isInsideVirtual = (path: EventTarget[], keypadEl: HTMLElement) => {
                        const inKeypad = path.includes(keypadEl);
                        const inInput = path.some(node => node instanceof Element && node.getAttribute("data-virtual-input") === "true");
                        return inKeypad || inInput;
                };

                const handlePointerDown = (e: PointerEvent) => {
                        if (!containerRef.current || !focusId) return;
                        const path = e.composedPath();
                        if (isInsideVirtual(path, containerRef.current)) {
                            outsideTapRef.current = null;
                            return;
                        }
                        outsideTapRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
                };

                const handlePointerUp = (e: PointerEvent) => {
                        if (!containerRef.current || !focusId) return;
                        const tap = outsideTapRef.current;
                        outsideTapRef.current = null;
                        if (!tap || tap.pointerId !== e.pointerId) return;

                        const dx = Math.abs(e.clientX - tap.x);
                        const dy = Math.abs(e.clientY - tap.y);
                        const moved = Math.hypot(dx, dy) > 10;
                        if (moved) return; // drag/scroll -> keep open

                        const path = e.composedPath();
                        if (isInsideVirtual(path, containerRef.current)) return;

                        onBlur(true);
                };

                window.addEventListener("pointerdown", handlePointerDown, { capture: true });
                window.addEventListener("pointerup", handlePointerUp, { capture: true });
                window.addEventListener("pointercancel", handlePointerUp, { capture: true });
                return () => {
                        window.removeEventListener("pointerdown", handlePointerDown, { capture: true });
                        window.removeEventListener("pointerup", handlePointerUp, { capture: true });
                        window.removeEventListener("pointercancel", handlePointerUp, { capture: true });
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

        // Render Portal to Body
        return createPortal(
                <ShadowWrapper
                        tagName={"virtual-keypad-canvas" as any}
                        hostRef={containerRef}
                        // Host Element Styles (The actual container)
                        style={{
                                position: "fixed",
                                bottom: 0,
                                left: 0,
                                right: 0,
                                margin: "0 auto",
                                width: viewport.width,
                                height: Math.round(200 / viewport.scale),
                                backgroundColor: theme === "dark" ? "#0f172a" : "#e2e8f0",
                                borderRadius: `calc(18px / ${viewport.scale}) calc(18px / ${viewport.scale}) 0 0`,
                                boxShadow: `0 calc(-6px / ${viewport.scale}) calc(30px / ${viewport.scale}) rgba(15, 23, 42, 0.2)`,
                                zIndex: 9999,
                                overflow: "hidden",
                                userSelect: "none",
                                touchAction: "none",
                                // CSS Variables for internal usage if needed
                                "--scale-factor": viewport.scale,
                                "--keypad-bg": theme === "dark" ? "#0f172a" : "#e2e8f0",
                        } as React.CSSProperties}
                        // Event Handlers on Host
                        onFocus={() => { if (focusId) onFocus(focusId) }}
                        onBlur={onBlur}
                        onContextMenu={(e) => e.preventDefault()}
                        onPointerDown={(e) => e.preventDefault()}
                        onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        // Internal Shadow DOM Styles
                        css={`
				:host {
					display: block;
				}
				canvas {
					display: block;
					width: 100%;
					height: 100%;
					touch-action: none;
				}
			`}
                >
                        <canvas
                                ref={canvasRef}
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerLeave={handlePointerUp}
                                onPointerCancel={handlePointerCancel}
                                style={{ width: '100%', height: '100%', display: 'block' }}
                        />
                </ShadowWrapper>,
                document.body
        );
}
