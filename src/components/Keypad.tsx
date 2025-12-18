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
                handlePointerUp
        } = useKeypadInteraction({
                inputRef,
                toggleShift,
                toggleKorean,
                shift,
                getTransformedValue,
                keyBoundsRef
        });


        // --- Layout & Rendering ---

        const drawRoundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
                ctx.beginPath();
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y);
                ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r);
                ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h);
                ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r);
                ctx.quadraticCurveTo(x, y, x + r, y);
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
                ctx.fillStyle = "#e8eaee";
                ctx.fillRect(0, 0, width, height);

                const scale = viewport.scale; // use for font scaling

                // Draw keys
                keyBoundsRef.current.forEach(key => {
                        // Check active state
                        let isPressed = false;
                        for (const press of activePresses.current.values()) {
                                const keyIndex = key.rowIndex * 100 + key.colIndex;
                                if (press.keyIndex === keyIndex) {
                                        isPressed = true;
                                        break;
                                }
                        }
                        // Modifiers active state
                        const isActiveModifier = (key.value === "Shift" && shift) || (key.value === "HangulMode" && hangulMode);

                        // Draw Key Shape
                        const radius = 12 / scale;

                        // Pressed animation logic? 
                        let drawX = key.x;
                        let drawY = key.y;
                        let drawW = key.w;
                        let drawH = key.h;

                        if (isPressed) {
                                const shrink = 2; // px
                                drawX += shrink;
                                drawY += shrink;
                                drawW -= shrink * 2;
                                drawH -= shrink * 2;
                        }

                        drawRoundedRect(ctx, drawX, drawY, drawW, drawH, radius);

                        // Fill
                        if (isPressed) {
                                const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
                                gradient.addColorStop(0, "rgba(248, 249, 251, 0.95)");
                                gradient.addColorStop(1, "#c9d2df");
                                ctx.fillStyle = gradient;
                        } else if (isActiveModifier) {
                                const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
                                gradient.addColorStop(0, "#e0ecff");
                                gradient.addColorStop(1, "#99b7ff");
                                ctx.fillStyle = gradient;
                        } else if (key.isAction) {
                                const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
                                gradient.addColorStop(0, "#f8fafc");
                                gradient.addColorStop(1, "#cbd5f5");
                                ctx.fillStyle = gradient;
                        } else {
                                const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
                                gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
                                gradient.addColorStop(1, "#dfe3eb");
                                ctx.fillStyle = gradient;
                        }
                        ctx.fill();

                        // Stroke/Shadow
                        ctx.lineWidth = 1 / scale;
                        if (isActiveModifier) {
                                ctx.strokeStyle = "rgba(37, 99, 235, 0.25)";
                        } else if (key.isAction) {
                                ctx.strokeStyle = "rgba(59, 130, 246, 0.55)";
                        } else {
                                ctx.strokeStyle = "rgba(148, 163, 184, 0.7)";
                        }
                        ctx.stroke();

                        // Text
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        const fontSize = 18 / scale; // px
                        ctx.font = `600 ${fontSize}px sans-serif`; // Approximation of system font

                        if (isActiveModifier || key.isAction) {
                                ctx.fillStyle = "#1e3a8a";
                        } else {
                                ctx.fillStyle = "#1f2933";
                        }

                        ctx.fillText(key.label, drawX + drawW / 2, drawY + drawH / 2);
                });

        }, [calculateLayout, hangulMode, shift, viewport.scale, activePresses, keyBoundsRef]); // Added deps


        // --- Interactions ---

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
                   background-color: #e8eaee;
                   border-radius: calc(18px / var(--scale-factor));
                   box-shadow: 0 calc(-6px / var(--scale-factor)) calc(30px / var(--scale-factor)) rgba(15, 23, 42, 0.2);
                   user-select: none;
                   -webkit-user-select: none;
                   touch-action: none;
                   z-index: 9999;
                   overflow: hidden; /* Canvas containment */
               }
               canvas {
                   display: block;
                   width: 100%;
                   height: 100%;
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
                                        onPointerCancel={handlePointerUp}
                                />
                        </div>
                </ShadowWrapper>
        );
}
