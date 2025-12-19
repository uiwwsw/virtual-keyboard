import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useImperativeHandle,
	useId,
} from "react";
import React from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { useVirtualInputContext } from "./Context";
import { parseKeyInput } from "../utils/parseKeyInput";
import { assemble } from "es-hangul";
import { isHangul } from "../utils/isHangul";


export interface VirtualInputHandle {
	handleKeyDown: (e: KeyboardEvent | React.KeyboardEvent) => void;
	scrollIntoView: () => void;
}

export interface VirtualInputProps extends React.HTMLAttributes<HTMLDivElement> {
	value?: string;
	defaultValue?: string;
	placeholder?: string;
	onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function VirtualInput({
	value: controlledValue,
	defaultValue,
	placeholder,
	onChange,
	...props
}: VirtualInputProps) {
	const id = useId();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const [internalValue, setInternalValue] = useState(
		controlledValue ?? defaultValue ?? "",
	);
	const [caretIndex, setCaretIndex] = useState<number>(
		() => (controlledValue ?? defaultValue ?? "").length,
	);

	// Refs for synchronous access in event handlers
	const internalValueRef = useRef(internalValue);
	const caretIndexRef = useRef(caretIndex);

	const [selection, setSelection] = useState<{
		start: number | null;
		end: number | null;
	}>({ start: null, end: null });

	// State for blinking cursor
	const [showCursor, setShowCursor] = useState(true);

	// Cache for character positions to avoid re-measuring text every frame
	const charPositionsRef = useRef<number[]>([]);
	const scrollXRef = useRef(0); // Viewport scroll offset

	// Invalidate cache when value changes
	useEffect(() => {
		// Resetting cache so it rebuilds on next draw.
		// We set it to empty array or size 0 to indicate invalidation.
		charPositionsRef.current = [];
	}, [internalValue]);


	const {
		focusId,
		onFocus,
		onBlur,
		hangulMode,
		setHangulMode,
		isCompositionRef,
		inputRef,
		shift,
	} = useVirtualInputContext();

	const isFocused = focusId === id;

	// Sync controlled value
	useEffect(() => {
		if (controlledValue !== undefined && controlledValue !== internalValue) {
			setInternalValue(controlledValue);
			internalValueRef.current = controlledValue;
		}
	}, [controlledValue, internalValue]);

	// Blinking cursor effect
	useEffect(() => {
		if (!isFocused) return;
		const interval = setInterval(() => {
			setShowCursor((prev: boolean) => !prev);
		}, 530); // Standard blink rate
		return () => clearInterval(interval);
	}, [isFocused]);

	// Force cursor visible on typing/moving
	useEffect(() => {
		setShowCursor(true);
	}, [caretIndex, internalValue]);


	// Selection Helper
	const hasSelection = useMemo(
		() =>
			selection.start !== null &&
			selection.end !== null &&
			selection.start !== selection.end,
		[selection],
	);

	const clearSelection = useCallback(() => {
		setSelection({ start: null, end: null });
	}, []);

	const deleteSelectedText = useCallback(() => {
		// Use refs for latest state
		const currentVal = internalValueRef.current;

		if (!hasSelection || selection.start === null || selection.end === null) {
			return { newString: currentVal, finalCaretIndex: caretIndexRef.current };
		}

		const [start, end] = [selection.start, selection.end].sort((a, b) => a - b);
		const newString = currentVal.slice(0, start) + currentVal.slice(end);

		clearSelection();
		return { newString, finalCaretIndex: start };
	}, [
		hasSelection,
		selection,
		clearSelection,
	]);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Handle resize
		const dpr = window.devicePixelRatio || 1;
		const rect = container.getBoundingClientRect();

		// Check if resize needed
		if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx.scale(dpr, dpr);
			// Invalidate cache if resized? 
			// Text measurements (width) depend on font, which depends on CSS, 
			// which might change on resize (responsive font).
			charPositionsRef.current = [];
		}

		const width = rect.width;
		const height = rect.height;

		// Clear
		ctx.clearRect(0, 0, width, height);

		// Font styles - inherit or default
		const computedStyle = window.getComputedStyle(container);
		// precise font construction
		const font = `${computedStyle.fontStyle} ${computedStyle.fontVariant} ${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

		// Optimisation: only set font if changed? 
		// ctx.font lookup is fast, but let's just set it.
		ctx.font = font;
		ctx.textBaseline = "middle";

		const fontSize = parseFloat(computedStyle.fontSize);
		const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
		const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
		const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
		const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
		const color = computedStyle.color || "black";
		const caretColor = (computedStyle.caretColor !== "auto" ? computedStyle.caretColor : color) || "black";
		const y = height / 2;
		const x = borderLeft + paddingLeft; // Start text after border and padding

		// Placeholder
		if (!internalValue && placeholder) {
			ctx.fillStyle = "#aaa";
			ctx.fillText(placeholder, x, y);
			if (isFocused && showCursor) {
				ctx.beginPath();
				ctx.moveTo(x, y - fontSize / 2);
				ctx.lineTo(x, y + fontSize / 2);
				ctx.strokeStyle = caretColor;
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
			return;
		}


		ctx.fillStyle = color;

		// Measure for Selection (Optimized)
		if (charPositionsRef.current.length !== internalValue.length + 1) {
			let currentX = x; // Keep for now if logic needs it? No, loop below doesn't use it.
			// Wait, previous loop used it. New loop uses slice.
			// The variable 'currentX' is defined at line 201: let currentX = x;
			// We can just remove it.
			const positions = [x];
			for (let i = 0; i < internalValue.length; i++) {
				// Measure cumulative width to account for kerning/ligatures
				const w = ctx.measureText(internalValue.slice(0, i + 1)).width;
				positions.push(x + w);
			}
			charPositionsRef.current = positions;
		}
		const charX = charPositionsRef.current;

		// --- Scroll Logic ---
		// We calculate desired scroll based on caret position
		const caretPos = charX[caretIndex] ?? x; // This includes 'x' (paddingLeft)

		// Viewport logic:
		// Visible area is from 0 to width.
		// Content area starts at scrollXRef.current.
		// We want caretPos - scrollX to be within [paddingLeft + padding, width - paddingRight - padding]

		const viewLeft = paddingLeft;
		// viewRight is the right edge of the content area.
		// width (from getBoundingClientRect) includes borders.
		// So we must subtract borderRight as well.
		const viewRight = width - paddingRight - borderLeft - borderRight;
		// Actually, if x starts at paddingLeft, is x relative to border-box or content-box?
		// Canvas creates a context where (0,0) is top-left of the canvas element.
		// If canvas is size of clientRect (border-box), then 0 is the left border edge.
		// So content starts at borderLeft + paddingLeft.

		// If I set `x = paddingLeft`, I am assuming 0 is the start of padding box.
		// But 0 is start of border box.
		// So x should be borderLeft + paddingLeft.
		// And viewRight should be width - borderRight - paddingRight.

		// Let's Correct `x` first.
		const safety = 2; // Minimal safety to prevent exact edge clipping

		// If total text fits in available container width, snap to 0
		const totalTextWidth = (charX[charX.length - 1] ?? x) - x; // Pure text width
		const availableWidth = viewRight - viewLeft;

		if (totalTextWidth < availableWidth) {
			scrollXRef.current = 0;
		} else {
			let s = scrollXRef.current;

			// If caret is too far right (hidden):
			// caretPos - s > viewRight - safety
			// s < caretPos - viewRight + safety
			// -> move s up (scroll right)
			if (caretPos - s > viewRight - safety) {
				s = caretPos - viewRight + safety;
			}

			// If caret is too far left (hidden):
			// caretPos - s < viewLeft + safety
			// s > caretPos - viewLeft - safety
			// -> move s down (scroll left)
			if (caretPos - s < viewLeft + safety) {
				s = caretPos - viewLeft - safety;
			}

			// Clamp
			// Max scroll: contentEnd - viewRight + safety?
			// Actually max scroll is such that the end of text touches right side?
			// Let's stick to standard behavior: max scroll = totalContentWidth (including padding) - viewportWidth
			// Total content content logic: starting at x=paddingLeft.
			// Last char at charX[last].
			// We want charX[last] - s >= viewRight - safety at least?

			const contentEnd = charX[charX.length - 1] ?? x;
			const maxScroll = Math.max(0, contentEnd - viewRight + safety);

			s = Math.max(0, Math.min(s, maxScroll));
			scrollXRef.current = s;
		}

		ctx.save();
		ctx.translate(-scrollXRef.current, 0);

		// Draw Selection
		if (hasSelection && selection.start !== null && selection.end !== null) {
			const [start, end] = [selection.start, selection.end].sort((a, b) => a - b);

			// Safe access
			const startX = charX[start] ?? x;
			const endX = charX[end] ?? charX[charX.length - 1];

			ctx.fillStyle = "#b4d5fe";
			ctx.fillRect(startX, 0, endX - startX, height);
			ctx.fillStyle = color; // reset for text
		}

		// Draw text
		ctx.fillText(internalValue, x, y);

		// Draw Cursor
		if (isFocused && showCursor && !hasSelection) {
			const caretX = charX[caretIndex] ?? x;

			ctx.beginPath();
			ctx.moveTo(caretX, y - fontSize / 2);
			ctx.lineTo(caretX, y + fontSize / 2);
			ctx.strokeStyle = caretColor;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

		ctx.restore();
	}, [internalValue, caretIndex, isFocused, showCursor, placeholder, hasSelection, selection]);

	// Animation Loop
	useEffect(() => {
		let animationFrameId: number;
		const loop = () => {
			draw();
			animationFrameId = requestAnimationFrame(loop);
		};
		loop();
		return () => cancelAnimationFrame(animationFrameId);
	}, [draw]);


	const updateValue = useCallback(
		(newValue: string, newCaretIndex: number) => {
			// Update refs immediately
			internalValueRef.current = newValue;
			caretIndexRef.current = newCaretIndex;

			if (controlledValue === undefined) {
				setInternalValue(newValue);
			}

			// Mock event for compatibility
			const fakeInput = { value: newValue } as HTMLInputElement;
			const changeEvent = {
				target: fakeInput,
				currentTarget: fakeInput,
			} as React.ChangeEvent<HTMLInputElement>;

			onChange?.(changeEvent);
			setCaretIndex(newCaretIndex);
		},
		[controlledValue, onChange],
	);

	const getCharIndexFromX = useCallback((clientX: number) => {
		const canvas = canvasRef.current;
		if (!canvas) return 0;

		const rect = canvas.getBoundingClientRect();

		const x = clientX - rect.left + scrollXRef.current; // Account for scroll

		// We can try to use cache if we are sure it's valid, but safe to measure again for click
		// Or if we want strict consistency, we use the cache used in draw.
		// But draw might not have run yet if component just mounted (unlikely for click).
		// Let's use cache if available and valid length.

		if (charPositionsRef.current.length === internalValue.length + 1) {
			const charX = charPositionsRef.current;
			// Find closest
			for (let i = 0; i < charX.length - 1; i++) {
				const center = (charX[i] + charX[i + 1]) / 2;
				if (x < center) return i;
			}
			return internalValue.length;
		}

		// Fallback: re-measure
		const ctx = canvas.getContext("2d");
		if (!ctx) return 0;
		const computedStyle = window.getComputedStyle(containerRef.current!);
		ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

		let currentX = 0;
		for (let i = 0; i < internalValue.length; i++) {
			const w = ctx.measureText(internalValue[i]).width;
			if (x < currentX + w / 2) {
				return i;
			}
			currentX += w;
		}
		return internalValue.length;
	}, [internalValue]);

	const handleCanvasClick = useCallback((e: React.MouseEvent) => {
		const index = getCharIndexFromX(e.clientX);

		// Update helpers
		caretIndexRef.current = index;
		setCaretIndex(index);

		clearSelection();
		onFocus(id);
	}, [getCharIndexFromX, clearSelection, onFocus, id]);

	// Reuse handleKeyDown from old Input, adapted
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent | KeyboardEvent) => {
			// Use refs for current state
			const currentVal = internalValueRef.current;
			const currentCaret = caretIndexRef.current;

			if (e.key === "HangulMode") {
				setHangulMode(!hangulMode);
				return;
			}

			// Selection keys (Shift + Arrow) - simplify for now or implement?
			// Let's implement basic Shift+Arrow
			if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
				const newIndex = e.key === "ArrowLeft"
					? Math.max(0, currentCaret - 1)
					: Math.min(currentVal.length, currentCaret + 1);

				setSelection((prev: { start: number | null; end: number | null }) => ({
					start: prev.start ?? currentCaret,
					end: newIndex
				}));

				caretIndexRef.current = newIndex;
				setCaretIndex(newIndex);
				return;
			}

			switch (e.key) {
				case "ArrowLeft": {
					const newIndex = Math.max(0, currentCaret - 1);
					caretIndexRef.current = newIndex;
					setCaretIndex(newIndex);
					clearSelection();
					return;
				}
				case "ArrowRight": {
					const newIndex = Math.min(currentVal.length, currentCaret + 1);
					caretIndexRef.current = newIndex;
					setCaretIndex(newIndex);
					clearSelection();
					return;
				}
				case "Backspace": {
					isCompositionRef.current = false;
					if (hasSelection) {
						const { newString, finalCaretIndex } = deleteSelectedText();
						updateValue(newString, finalCaretIndex);
					} else if (currentCaret > 0) {
						const newString = currentVal.slice(0, currentCaret - 1) + currentVal.slice(currentCaret);
						updateValue(newString, currentCaret - 1);
					}
					return;
				}
			}

			// Typing
			const result = parseKeyInput(e, hangulMode);
			if (result.toggleHangulMode) {
				setHangulMode(!hangulMode);
				return;
			}

			if (!result.handled || !result.text) return;
			// Ignore modifiers
			if (e.ctrlKey || e.metaKey || e.altKey) return;

			const { composing } = result;
			let { text } = result;

			if (shift && text.length === 1 && text.match(/[a-z]/i)) {
				text = text.toUpperCase();
			}

			const { newString, finalCaretIndex } = hasSelection
				? deleteSelectedText()
				: { newString: currentVal, finalCaretIndex: currentCaret };

			const prevChar = newString[finalCaretIndex - 1];
			if (composing && isHangul(prevChar) && isCompositionRef.current) {
				const combined = assemble([prevChar, text]);
				const finalString = newString.slice(0, finalCaretIndex - 1) + combined + newString.slice(finalCaretIndex);
				updateValue(finalString, finalCaretIndex - 1 + combined.length);
			} else {
				const finalString = newString.slice(0, finalCaretIndex) + text + newString.slice(finalCaretIndex);
				updateValue(finalString, finalCaretIndex + text.length);
			}
			isCompositionRef.current = composing;

		},
		[hangulMode, setHangulMode, isCompositionRef, shift, updateValue, hasSelection, deleteSelectedText, clearSelection]
	);

	useImperativeHandle(inputRef, () => {
		if (isFocused) {
			return {
				handleKeyDown,
				scrollIntoView: () => {
					containerRef.current?.scrollIntoView({
						behavior: "smooth",
						block: "nearest",
					});
				}
			};
		}
		return inputRef.current!;
	}, [isFocused, handleKeyDown, inputRef]);


	return (
		<ShadowWrapper
			tagName={"virtual-input-canvas" as "input"}
			css={`
                canvas {
                    width: 100%;
                    height: 100%;
                    cursor: text;
                    display: block;
                }
            `}
		>
			<div
				ref={containerRef}
				{...props}
				role="textbox"
				tabIndex={0}
				style={{
					minHeight: "1.5em",
					height: "1.5em",
					outline: "none",
					font: "inherit",
					width: "100%",
					position: "relative",
					...props.style
				}}
				onFocus={() => onFocus(id)}
				onBlur={(e) => onBlur(e)}
				onKeyDown={handleKeyDown}
				onClick={handleCanvasClick}
				data-virtual-input="true"
			>
				<canvas ref={canvasRef} />
			</div>
		</ShadowWrapper>
	);
}
