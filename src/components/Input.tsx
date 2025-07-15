// components/Input.tsx
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
	initialValue?: string;
}
export function VirtualInput({ initialValue = "" }: VirtualInputProps) {
	const id = useId();
	const [letters, setLetters] = useState<string[]>(() =>
		initialValue.split(""),
	);
	const [caretIndex, setCaretIndex] = useState<number>(
		() => initialValue.length,
	);
	const [selection, setSelection] = useState<{
		start: number | null;
		end: number | null;
	}>({ start: null, end: null });

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
		if (!hasSelection || selectionStart === null || selectionEnd === null)
			return { newLetters: [...letters], finalCaretIndex: caretIndex };

		const [start, end] = [selectionStart, selectionEnd].sort((a, b) => a - b);
		const newLetters = [...letters];
		newLetters.splice(start, end - start);

		clearSelection();
		setCaretIndex(start);
		return { newLetters, finalCaretIndex: start };
	}, [
		letters,
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

			const { newLetters } = hasSelection
				? deleteSelectedText()
				: { newLetters: [...letters] };
			const pastedLetters = pastedText.split("");

			const currentCaret = hasSelection
				? [selection.start, selection.end].sort(
						(a, b) => (a ?? 0) - (b ?? 0),
					)[0]
				: caretIndex;

			newLetters.splice(currentCaret ?? 0, 0, ...pastedLetters);
			setLetters(newLetters);
			setCaretIndex((currentCaret ?? 0) + pastedLetters.length);
			clearSelection();
		},
		[
			letters,
			caretIndex,
			hasSelection,
			selection.start,
			selection.end,
			clearSelection,
			deleteSelectedText,
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
						const { newLetters, finalCaretIndex } = deleteSelectedText();
						setLetters(newLetters);
						setCaretIndex(finalCaretIndex);
					} else if (caretIndex > 0) {
						const newLetters = [...letters];
						newLetters.splice(caretIndex - 1, 1);
						setLetters(newLetters);
						setCaretIndex((i) => i - 1);
					}
					break;
				}
				case "Delete": {
					isCompositionRef.current = false;
					if (hasSelection) {
						const { newLetters, finalCaretIndex } = deleteSelectedText();
						setLetters(newLetters);
						setCaretIndex(finalCaretIndex);
					} else if (caretIndex < letters.length) {
						const newLetters = [...letters];
						newLetters.splice(caretIndex, 1);
						setLetters(newLetters);
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

					let { text, composing } = result;

					if (shift && text.length === 1 && text.match(/[a-z]/i)) {
						text = text.toUpperCase();
					}

					const { newLetters, finalCaretIndex } = hasSelection
						? deleteSelectedText()
						: { newLetters: [...letters], finalCaretIndex: caretIndex };

					const prevChar = newLetters[finalCaretIndex - 1];

					if (composing && isHangul(prevChar) && isCompositionRef.current) {
						const combined = assemble([prevChar, text]).split("");
						newLetters.splice(finalCaretIndex - 1, 1, ...combined);
						setLetters(newLetters);
						setCaretIndex(finalCaretIndex - 1 + combined.length);
					} else {
						newLetters.splice(finalCaretIndex, 0, text);
						setLetters(newLetters);
						setCaretIndex(finalCaretIndex + 1);
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
        /* CSS 스타일은 여기에 그대로 유지 */
        .wrap {
          white-space: pre;
          position: relative;
          cursor: text;
          padding: 8px;
          background-color: #f0f0f0;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        .wrap::after {
          content: " ";
        }
        .wrap:focus {
          outline: 2px solid #007bff;
          border-color: #007bff;
        }
        .letter {
          position: relative;
          font-style: normal;
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
				className="wrap"
				role="textbox"
				tabIndex={0}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				onClick={handleClickWrap}
				onPaste={handlePaste}
			>
				{letters.map((char, i) => (
					<span key={`char-${char}-${i}`}>
						{caretIndex === i && isFocused && !hasSelection && (
							<BlinkingCaret />
						)}
						<span
							role="button"
							tabIndex={-1}
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
