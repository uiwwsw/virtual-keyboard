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
}

export interface VirtualInputProps {
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

	const [selection, setSelection] = useState<{
		start: number | null;
		end: number | null;
	}>({ start: null, end: null });

	// State for blinking cursor
	const [showCursor, setShowCursor] = useState(true);

	// Cache for character positions to avoid re-measuring text every frame
	const charPositionsRef = useRef<number[]>([]);

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
		if (!hasSelection || selection.start === null || selection.end === null) {
			return { newString: internalValue, finalCaretIndex: caretIndex };
		}

		const [start, end] = [selection.start, selection.end].sort((a, b) => a - b);
		const newString = internalValue.slice(0, start) + internalValue.slice(end);

		clearSelection();
		return { newString, finalCaretIndex: start };
	}, [
		internalValue,
		caretIndex,
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
		const font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

		// Optimisation: only set font if changed? 
		// ctx.font lookup is fast, but let's just set it.
		ctx.font = font;
		ctx.textBaseline = "middle";

		const fontSize = parseFloat(computedStyle.fontSize);
		const y = height / 2;
		const x = 0; // standard padding?

		// Placeholder
		if (!internalValue && placeholder) {
			ctx.fillStyle = "#aaa";
			ctx.fillText(placeholder, x, y);
			if (isFocused && showCursor) {
				ctx.beginPath();
				ctx.moveTo(x, y - fontSize / 2);
				ctx.lineTo(x, y + fontSize / 2);
				ctx.strokeStyle = "black";
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
			return;
		}

		ctx.fillStyle = "black";

		// Measure for Selection (Optimized)
		// Check if cache is valid (simple length check + cache existence)
		// NOTE: We invalidate cache on internalValue change in useEffect, but here we can double check.
		// Also if invalid, rebuild.
		if (charPositionsRef.current.length !== internalValue.length + 1) {
			let currentX = x;
			const positions = [x];
			for (let i = 0; i < internalValue.length; i++) {
				// Measure char logic
				const w = ctx.measureText(internalValue[i]).width;
				currentX += w;
				positions.push(currentX);
			}
			charPositionsRef.current = positions;
		}
		const charX = charPositionsRef.current;

		// Draw Selection
		if (hasSelection && selection.start !== null && selection.end !== null) {
			const [start, end] = [selection.start, selection.end].sort((a, b) => a - b);

			// Safe access
			const startX = charX[start] ?? x;
			const endX = charX[end] ?? charX[charX.length - 1];

			ctx.fillStyle = "#b4d5fe";
			ctx.fillRect(startX, 0, endX - startX, height);
			ctx.fillStyle = "black"; // reset for text
		}

		// Draw text
		ctx.fillText(internalValue, x, y);

		// Draw Cursor
		if (isFocused && showCursor && !hasSelection) {
			const caretX = charX[caretIndex] ?? x;

			ctx.beginPath();
			ctx.moveTo(caretX, y - fontSize / 2);
			ctx.lineTo(caretX, y + fontSize / 2);
			ctx.strokeStyle = "black";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
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
		const x = clientX - rect.left;

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
		setCaretIndex(index);
		clearSelection();
		onFocus(id);
	}, [getCharIndexFromX, clearSelection, onFocus, id]);

	// Reuse handleKeyDown from old Input, adapted
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent | KeyboardEvent) => {

			if (e.key === "HangulMode") {
				setHangulMode(!hangulMode);
				return;
			}

			// Selection keys (Shift + Arrow) - simplify for now or implement?
			// Let's implement basic Shift+Arrow
			if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
				const newIndex = e.key === "ArrowLeft"
					? Math.max(0, caretIndex - 1)
					: Math.min(internalValue.length, caretIndex + 1);

				setSelection((prev: { start: number | null; end: number | null }) => ({
					start: prev.start ?? caretIndex,
					end: newIndex
				}));
				setCaretIndex(newIndex);
				return;
			}

			switch (e.key) {
				case "ArrowLeft":
					setCaretIndex(prev => Math.max(0, prev - 1));
					clearSelection();
					return;
				case "ArrowRight":
					setCaretIndex(prev => Math.min(internalValue.length, prev + 1));
					clearSelection();
					return;
				case "Backspace": {
					isCompositionRef.current = false;
					if (hasSelection) {
						const { newString, finalCaretIndex } = deleteSelectedText();
						updateValue(newString, finalCaretIndex);
					} else if (caretIndex > 0) {
						const newString = internalValue.slice(0, caretIndex - 1) + internalValue.slice(caretIndex);
						updateValue(newString, caretIndex - 1);
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
				: { newString: internalValue, finalCaretIndex: caretIndex };

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
		[internalValue, caretIndex, hangulMode, setHangulMode, isCompositionRef, shift, updateValue, hasSelection, deleteSelectedText, clearSelection]
	);

	useImperativeHandle(inputRef, () => {
		if (isFocused) {
			return { handleKeyDown };
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
					position: "relative"
				}}
				onFocus={() => onFocus(id)}
				onBlur={onBlur}
				onKeyDown={handleKeyDown}
				onClick={handleCanvasClick}
			>
				<canvas ref={canvasRef} />
			</div>
		</ShadowWrapper>
	);
}
