// components/Input.tsx
/** biome-ignore-all lint/a11y/useFocusableInteractive: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all assist/source/organizeImports: <explanation> */
/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import {
	useState,
	type ClipboardEvent,
	useMemo,
	useCallback,
	useId,
	useImperativeHandle,
	useEffect,
	useRef,
} from "react";
import { assemble } from "es-hangul";
import { isHangul } from "../utils/isHangul";
import { ShadowWrapper } from "./ShadowWrapper";
import { BlinkingCaret } from "./BlinkingCaret";
import { useVirtualInputContext } from "./Context";
import { parseKeyInput } from "../utils/parseKeyInput";

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
	const divRef = useRef<HTMLDivElement>(null);

	const letters = useMemo(() => internalValue.split(""), [internalValue]);

	const updateValue = useCallback(
		(newValue: string, newCaretIndex: number) => {
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

	useEffect(() => {
		if (controlledValue !== undefined && controlledValue !== internalValue) {
			setInternalValue(controlledValue);
		}
	}, [controlledValue, internalValue]);

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
	const selectionStart = selection.start;
	const selectionEnd = selection.end;

	const hasSelection = useMemo(
		() =>
			selectionStart !== null &&
			selectionEnd !== null &&
			selectionStart !== selectionEnd,
		[selectionStart, selectionEnd],
	);

	const clearSelection = useCallback(() => {
		setSelection({ start: null, end: null });
	}, []);

	const deleteSelectedText = useCallback(() => {
		if (!hasSelection || selectionStart === null || selectionEnd === null) {
			return { newString: internalValue, finalCaretIndex: caretIndex };
		}

		const [start, end] = [selectionStart, selectionEnd].sort((a, b) => a - b);
		const newString = internalValue.slice(0, start) + internalValue.slice(end);

		clearSelection();
		return { newString, finalCaretIndex: start };
	}, [
		internalValue,
		caretIndex,
		hasSelection,
		selectionStart,
		selectionEnd,
		clearSelection,
	]);

	const handlePaste = useCallback(
		(e: ClipboardEvent<HTMLDivElement>) => {
			e.preventDefault();
			const pastedText = e.clipboardData.getData("text/plain");
			if (!pastedText) return;

			const { newString, finalCaretIndex } = hasSelection
				? deleteSelectedText()
				: { newString: internalValue, finalCaretIndex: caretIndex };

			const finalString =
				newString.slice(0, finalCaretIndex) +
				pastedText +
				newString.slice(finalCaretIndex);
			const newCaretPosition = finalCaretIndex + pastedText.length;

			updateValue(finalString, newCaretPosition);
			clearSelection();
		},
		[
			internalValue,
			caretIndex,
			hasSelection,
			clearSelection,
			deleteSelectedText,
			updateValue,
		],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent | KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
				e.preventDefault();
				setSelection({ start: 0, end: letters.length });
				return;
			}
			if (e.key === "HangulMode") {
				setHangulMode(!hangulMode);
				return;
			}

			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
				if (hasSelection && selectionStart !== null && selectionEnd !== null) {
					e.preventDefault();
					const [start, end] = [selectionStart, selectionEnd].sort(
						(a, b) => a - b,
					);
					const textToCopy = letters.slice(start, end).join("");
					navigator.clipboard.writeText(textToCopy).catch((err) => {
						console.error("Failed to copy text: ", err);
					});
				}
				return;
			}

			if (
				(e.ctrlKey || e.metaKey) &&
				(e.key.toLowerCase() === "c" || e.key.toLowerCase() === "v")
			)
				return;

			switch (e.key) {
				case "Backspace": {
					isCompositionRef.current = false;
					if (hasSelection) {
						const { newString, finalCaretIndex } = deleteSelectedText();
						updateValue(newString, finalCaretIndex);
					} else if (caretIndex > 0) {
						const newString =
							internalValue.slice(0, caretIndex - 1) +
							internalValue.slice(caretIndex);
						updateValue(newString, caretIndex - 1);
					}
					break;
				}
				case "Delete": {
					isCompositionRef.current = false;
					if (hasSelection) {
						const { newString, finalCaretIndex } = deleteSelectedText();
						updateValue(newString, finalCaretIndex);
					} else if (caretIndex < letters.length) {
						const newString =
							internalValue.slice(0, caretIndex) +
							internalValue.slice(caretIndex + 1);
						updateValue(newString, caretIndex);
					}
					break;
				}
				case "ArrowLeft": {
					isCompositionRef.current = false;
					const newCaretIndex = Math.max(0, caretIndex - 1);
					if (e.shiftKey) {
						setSelection((prev) => ({
							start: prev.start ?? caretIndex,
							end: newCaretIndex,
						}));
					} else {
						clearSelection();
					}
					setCaretIndex(newCaretIndex);
					break;
				}
				case "ArrowRight": {
					isCompositionRef.current = false;
					const newCaretIndex = Math.min(letters.length, caretIndex + 1);
					if (e.shiftKey) {
						setSelection((prev) => ({
							start: prev.start ?? caretIndex,
							end: newCaretIndex,
						}));
					} else {
						clearSelection();
					}
					setCaretIndex(newCaretIndex);
					break;
				}
				case "Unidentified":
				case "Shift":
				case "Control":
				case "Alt":
				case "Meta":
				case "CapsLock":
				case "Enter":
				case "Tab":
				case "ArrowUp":
				case "ArrowDown":
					e.stopPropagation();
					break;
				case "End": {
					const newCaretIndex = letters.length;
					if (e.shiftKey) {
						setSelection((prev) => ({
							...prev,
							end: newCaretIndex,
						}));
					}
					setCaretIndex(newCaretIndex);
					break;
				}

				default: {
					const result = parseKeyInput(e, hangulMode);

					if (result.toggleHangulMode) {
						setHangulMode(!hangulMode);
						return;
					}

					if (!result.handled || !result.text) return;
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
						const finalString =
							newString.slice(0, finalCaretIndex - 1) +
							combined +
							newString.slice(finalCaretIndex);
						updateValue(finalString, finalCaretIndex - 1 + combined.length);
					} else {
						const finalString =
							newString.slice(0, finalCaretIndex) +
							text +
							newString.slice(finalCaretIndex);
						updateValue(finalString, finalCaretIndex + text.length);
					}

					isCompositionRef.current = composing;
					break;
				}
			}
		},
		[
			letters,
			caretIndex,
			hasSelection,
			selectionStart,
			selectionEnd,
			clearSelection,
			deleteSelectedText,
			hangulMode,
			setHangulMode,
			isCompositionRef,
			shift,
			updateValue,
			internalValue,
		],
	);
	const handleFocus = useCallback(() => {
		onFocus(id);
	}, [onFocus, id]);

	const handleBlur = useCallback(() => {
		onBlur();
	}, [onBlur]);
	const handleClickWrap = useCallback(() => {
		clearSelection();
		setCaretIndex(letters.length);
	}, [clearSelection, letters.length]);

	const handleClickLetter = useCallback(
		(index: number) => {
			clearSelection();
			setCaretIndex(index);
		},
		[clearSelection],
	);

	const isSelected = useCallback(
		(index: number) => {
			if (!hasSelection || selectionStart === null || selectionEnd === null)
				return false;
			const [start, end] = [selectionStart, selectionEnd].sort((a, b) => a - b);
			return index >= start && index < end;
		},
		[hasSelection, selectionStart, selectionEnd],
	);

	const handleClickLetterEvent = (e: React.MouseEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		handleClickLetter(Number(e.currentTarget.dataset.value));
	};
	useImperativeHandle(inputRef, () => {
		if (isFocused) {
			return {
				handleKeyDown,
			};
		}
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		return inputRef.current!;
	}, [isFocused, handleKeyDown, inputRef]);

	return (
		<ShadowWrapper
			tagName={"virtual-input" as "input"}
			css={`
        .wrap {
          white-space: pre;
          position: relative;
          cursor: text;
          border-radius: 4px;
          user-select: none;
        }
        .wrap::after {
          content: " ";
        }
        .placeholder {
          position: absolute;
          left: 0;
          top: 0;
          color: #aaa;
          pointer-events: none;
        }
        .letter {
          position: relative;
          outline: none;
        }
        .letter.selected {
          background-color: #b4d5fe;
        }
        @keyframes blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        .blink {
          animation: blink 1s step-start infinite;
        }
      `}
		>
			<div
				{...props}
				ref={divRef}
				className="wrap"
				role="textbox"
				aria-placeholder={placeholder}
				tabIndex={0}
				style={{
					minHeight: "1.5em", // Standard input height
					lineHeight: "1.5em", // Standard input line height
					outline: "none", // Remove default outline
					font: "inherit",
					width: "100%",
				}}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				onClick={handleClickWrap}
				onPaste={handlePaste}
			>
				{!internalValue && placeholder && (
					<span className="placeholder">{placeholder}</span>
				)}
				{letters.map((char, i) => (
					<span key={`char-${char}-${i}`}>
						{caretIndex === i && isFocused && !hasSelection && (
							<BlinkingCaret />
						)}
						<span
							role="button"
							data-value={i}
							onClick={handleClickLetterEvent}
							className={`letter ${isSelected(i) ? "selected" : ""}`}
						>
							{char}
						</span>
					</span>
				))}
				{caretIndex === letters.length && isFocused && !hasSelection && (
					<BlinkingCaret />
				)}
			</div>
		</ShadowWrapper>
	);
}
