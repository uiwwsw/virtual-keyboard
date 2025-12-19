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
	const showCursorRef = useRef(showCursor);

	useEffect(() => {
		showCursorRef.current = showCursor;
	}, [showCursor]);

	// Long Press Logic
	const longPressTimerRef = useRef<number | null>(null);
	const [showCopyFeedback, setShowCopyFeedback] = useState(false);
	const pointerStartedRef = useRef(false);
	const pointerStartPositionRef = useRef<{ x: number; y: number } | null>(null);

	// Cache for character positions to avoid re-measuring text every frame
	const charPositionsRef = useRef<number[]>([]);
	const scrollXRef = useRef(0); // Viewport scroll offset

	// Invalidate cache when value changes
	useEffect(() => {
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

		if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
			canvas.width = rect.width * dpr;
			canvas.height = rect.height * dpr;
			ctx.scale(dpr, dpr);
			charPositionsRef.current = [];
		}

		const width = rect.width;
		const height = rect.height;

		ctx.clearRect(0, 0, width, height);

		const computedStyle = window.getComputedStyle(container);
		const font = `${computedStyle.fontStyle} ${computedStyle.fontVariant} ${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`;

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
		const x = borderLeft + paddingLeft;

		// Optimize: Use refs to avoid re-creating draw function
		const text = internalValueRef.current;
		const cIndex = caretIndexRef.current;
		const isCursorVisible = showCursorRef.current;

		if (!text && placeholder) {
			ctx.fillStyle = "#aaa";
			ctx.fillText(placeholder, x, y);
			if (isFocused && isCursorVisible) {
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

		if (charPositionsRef.current.length !== text.length + 1) {
			const positions = [x];
			for (let i = 0; i < text.length; i++) {
				const w = ctx.measureText(text.slice(0, i + 1)).width;
				positions.push(x + w);
			}
			charPositionsRef.current = positions;
		}
		const charX = charPositionsRef.current;

		// Scroll Logic
		const caretPos = charX[cIndex] ?? x;

		const viewLeft = paddingLeft;
		const viewRight = width - paddingRight - borderLeft - borderRight;

		const safety = 2;
		const totalTextWidth = (charX[charX.length - 1] ?? x) - x;
		const availableWidth = viewRight - viewLeft;

		if (totalTextWidth < availableWidth) {
			scrollXRef.current = 0;
		} else {
			let s = scrollXRef.current;
			if (caretPos - s > viewRight - safety) {
				s = caretPos - viewRight + safety;
			}
			if (caretPos - s < viewLeft + safety) {
				s = caretPos - viewLeft - safety;
			}
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
			const startX = charX[start] ?? x;
			const endX = charX[end] ?? charX[charX.length - 1];

			ctx.fillStyle = "#b4d5fe";
			ctx.fillRect(startX, 0, endX - startX, height);
			ctx.fillStyle = color;
		}

		// Draw text
		ctx.fillText(text, x, y);

		// Draw Cursor
		if (isFocused && isCursorVisible && !hasSelection) {
			const caretX = charX[cIndex] ?? x;
			ctx.beginPath();
			ctx.moveTo(caretX, y - fontSize / 2);
			ctx.lineTo(caretX, y + fontSize / 2);
			ctx.strokeStyle = caretColor;
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}

		// Draw Copy Feedback Overlay
		if (showCopyFeedback) {
			ctx.save();
			ctx.translate(scrollXRef.current, 0); // Undo scroll
			ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
			const msg = "Copied!";
			const msgWidth = ctx.measureText(msg).width + 20;
			const msgHeight = fontSize + 10;

			const cx = width / 2;
			const cy = height / 2;
			const r = 6;
			const rw = msgWidth;
			const rh = msgHeight;
			const rx = cx - rw / 2;
			const ry = cy - rh / 2;

			ctx.beginPath();
			ctx.fillStyle = "rgba(30, 41, 59, 0.9)";
			ctx.roundRect(rx, ry, rw, rh, r);
			ctx.fill();

			ctx.fillStyle = "#ffffff";
			ctx.font = `bold ${fontSize * 0.8}px system-ui`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText(msg, cx, cy);

			ctx.restore();
		}

		ctx.restore();
	}, [isFocused, placeholder, hasSelection, selection, showCopyFeedback]);

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
			internalValueRef.current = newValue;
			caretIndexRef.current = newCaretIndex;

			if (controlledValue === undefined) {
				setInternalValue(newValue);
			}

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
		const x = clientX - rect.left + scrollXRef.current;

		if (charPositionsRef.current.length === internalValue.length + 1) {
			const charX = charPositionsRef.current;
			for (let i = 0; i < charX.length - 1; i++) {
				const center = (charX[i] + charX[i + 1]) / 2;
				if (x < center) return i;
			}
			return internalValue.length;
		}

		const ctx = canvas.getContext("2d");
		if (!ctx) return 0;
		const computedStyle = window.getComputedStyle(containerRef.current!);
		ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;

		let currentX = 0;
		for (let i = 0; i < internalValue.length; i++) {
			const w = ctx.measureText(internalValue[i]).width;
			if (x < currentX + w / 2) return i;
			currentX += w;
		}
		return internalValue.length;
	}, [internalValue]);

	const handleCanvasClick = useCallback((e: React.MouseEvent) => {
		if (showCopyFeedback) return;
		const index = getCharIndexFromX(e.clientX);
		caretIndexRef.current = index;
		setCaretIndex(index);
		clearSelection();
		onFocus(id);
	}, [getCharIndexFromX, clearSelection, onFocus, id, showCopyFeedback]);

	// --- Clipboard Handlers (Native Events) ---

	const handleCopy = useCallback((e: React.ClipboardEvent) => {
		e.preventDefault();
		const currentVal = internalValueRef.current;
		const sel = selection;

		if (sel.start !== null && sel.end !== null && sel.start !== sel.end) {
			const [start, end] = [sel.start, sel.end].sort((a, b) => a - b);
			const textToCopy = currentVal.slice(start, end);
			e.clipboardData.setData('text/plain', textToCopy);

			if (navigator.vibrate) navigator.vibrate(50);
			setShowCopyFeedback(true);
			setTimeout(() => setShowCopyFeedback(false), 1500);
		}
	}, [selection]);

	const handleCut = useCallback((e: React.ClipboardEvent) => {
		e.preventDefault();
		const currentVal = internalValueRef.current;
		if (hasSelection && selection.start !== null && selection.end !== null) {
			const [start, end] = [selection.start, selection.end].sort((a, b) => a - b);
			const textToCopy = currentVal.slice(start, end);
			e.clipboardData.setData('text/plain', textToCopy);

			if (navigator.vibrate) navigator.vibrate(50);
			setShowCopyFeedback(true);
			setTimeout(() => setShowCopyFeedback(false), 1500);

			const { newString, finalCaretIndex } = deleteSelectedText();
			updateValue(newString, finalCaretIndex);
		}
	}, [hasSelection, selection, deleteSelectedText, updateValue]);

	const handlePaste = useCallback((e: React.ClipboardEvent) => {
		e.preventDefault();
		const text = e.clipboardData.getData('text/plain');
		if (!text) return;

		const currentVal = internalValueRef.current;
		const currentCaret = caretIndexRef.current;

		const { newString, finalCaretIndex } = hasSelection
			? deleteSelectedText()
			: { newString: currentVal, finalCaretIndex: currentCaret };

		const finalString = newString.slice(0, finalCaretIndex) + text + newString.slice(finalCaretIndex);
		updateValue(finalString, finalCaretIndex + text.length);
	}, [hasSelection, deleteSelectedText, updateValue]);

	// --- Long Press Handlers ---

	const cancelLongPress = useCallback(() => {
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
		pointerStartedRef.current = false;
		pointerStartPositionRef.current = null;
	}, []);

	const handlePointerDown = useCallback((e: React.PointerEvent) => {
		if (e.button !== 0) return;
		cancelLongPress();
		pointerStartedRef.current = true;
		pointerStartPositionRef.current = { x: e.clientX, y: e.clientY };

		longPressTimerRef.current = window.setTimeout(async () => {
			if (!pointerStartedRef.current) return;
			pointerStartedRef.current = false;

			try {
				if (internalValueRef.current) {
					await navigator.clipboard.writeText(internalValueRef.current);
					if (navigator.vibrate) navigator.vibrate(50);
					setShowCopyFeedback(true);
					setTimeout(() => setShowCopyFeedback(false), 1500);
				}
			} catch (err) {
				console.error("Failed to copy", err);
			}

		}, 600);
	}, [cancelLongPress]);

	const handlePointerMove = useCallback((e: React.PointerEvent) => {
		if (!pointerStartedRef.current || !pointerStartPositionRef.current) return;
		const dx = Math.abs(e.clientX - pointerStartPositionRef.current.x);
		const dy = Math.abs(e.clientY - pointerStartPositionRef.current.y);
		if (dx > 10 || dy > 10) cancelLongPress();
	}, [cancelLongPress]);

	const handlePointerUp = useCallback(() => {
		cancelLongPress();
	}, [cancelLongPress]);


	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent | KeyboardEvent) => {
			const currentVal = internalValueRef.current;
			const currentCaret = caretIndexRef.current;

			if (e.key === "HangulMode") {
				setHangulMode(!hangulMode);
				return;
			}

			const isCmd = e.ctrlKey || e.metaKey;

			// --- Navigation & Selection ---

			// Cmd+Left or ArrowUp -> Start
			// Cmd+Right or ArrowDown -> End
			const isHome = e.key === "ArrowUp" || (isCmd && e.key === "ArrowLeft") || e.key === "Home";
			const isEnd = e.key === "ArrowDown" || (isCmd && e.key === "ArrowRight") || e.key === "End";

			if (isHome) {
				e.preventDefault();
				const newIndex = 0;

				if (e.shiftKey) {
					setSelection((prev: { start: number | null; end: number | null }) => ({
						start: prev.start ?? currentCaret,
						end: newIndex
					}));
				} else {
					clearSelection();
				}

				caretIndexRef.current = newIndex;
				setCaretIndex(newIndex);
				return;
			}

			if (isEnd) {
				e.preventDefault();
				const newIndex = currentVal.length;

				if (e.shiftKey) {
					setSelection((prev: { start: number | null; end: number | null }) => ({
						start: prev.start ?? currentCaret,
						end: newIndex
					}));
				} else {
					clearSelection();
				}

				caretIndexRef.current = newIndex;
				setCaretIndex(newIndex);
				return;
			}

			if (e.ctrlKey || e.metaKey) {
				const key = e.key.toLowerCase();
				if (key === 'a') {
					e.preventDefault();
					setSelection({ start: 0, end: currentVal.length });
					caretIndexRef.current = currentVal.length;
					setCaretIndex(currentVal.length);
					return;
				}
				// Do not prevent default for c, v, x to allow native events (copy/paste)
			}

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

			const result = parseKeyInput(e, hangulMode);
			if (result.toggleHangulMode) {
				setHangulMode(!hangulMode);
				return;
			}

			if (!result.handled || !result.text) return;
			// Ignore keys if ctrl/meta/alt is pressed (except simple shift)
			// But we already checked ctrl/meta above.
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
			tagName={"virtual-input-canvas" as any}
			hostRef={containerRef}
			id={id}
			className={props.className}
			role="textbox"
			tabIndex={0}
			{...props}
			style={{
				display: "inline-block",
				minHeight: "1.5em",
				height: "1.5em",
				outline: "none",
				font: "inherit",
				width: "100%",
				position: "relative",
				cursor: "text",
				...props.style
			}}
			onFocus={() => onFocus(id, containerRef.current)}
			onBlur={(e) => onBlur(e)}
			onKeyDown={handleKeyDown}
			onContextMenu={(e) => e.preventDefault()}
			onCopy={handleCopy}
			onCut={handleCut}
			onPaste={handlePaste}
			onClick={handleCanvasClick}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			onPointerLeave={handlePointerUp}
			onPointerCancel={handlePointerUp}
			data-virtual-input="true"
			css={`
				:host {
					display: inline-block;
					position: relative;
				}
                canvas {
                    width: 100%;
                    height: 100%;
                    display: block;
                }
            `}
		>
			<canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
		</ShadowWrapper>
	);
}
