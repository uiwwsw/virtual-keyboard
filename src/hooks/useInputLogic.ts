// /components/Input/useInputLogic.ts
import {
	useState,
	useRef,
	type KeyboardEvent,
	type ClipboardEvent,
	useMemo,
} from "react";
import { assemble, convertQwertyToHangul } from "es-hangul";
import { isHangul } from "../utils/isHangul"; // isHangul 유틸리티 경로에 맞게 수정해주세요.
import { useStorage } from "./useStorage";

export interface UseInputLogicProps {
	initialValue?: string;
}

export function useInputLogic({ initialValue = "" }: UseInputLogicProps) {
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
	const [isFocused, setIsFocused] = useState<boolean>(false);

	const [hangulMode, setHangulMode] = useStorage(
		"virtual-keyboard-hangul-mode",
		false,
	);

	// const hangulModeRef = useRef(hangulMode);
	const isCompositionRef = useRef(false);

	const selectionStart = selection.start;
	const selectionEnd = selection.end;

	const hasSelection = useMemo(
		() =>
			selectionStart !== null &&
			selectionEnd !== null &&
			selectionStart !== selectionEnd,
		[selectionStart, selectionEnd],
	);

	const clearSelection = () => {
		setSelection({ start: null, end: null });
	};

	const deleteSelectedText = () => {
		if (!hasSelection)
			return { newLetters: [...letters], finalCaretIndex: caretIndex };

		const [start, end] = [selectionStart!, selectionEnd!].sort((a, b) => a - b);
		const newLetters = [...letters];
		newLetters.splice(start, end - start);

		clearSelection();
		setCaretIndex(start);
		return { newLetters, finalCaretIndex: start };
	};

	const handleFocus = () => setIsFocused(true);
	const handleBlur = () => {
		setIsFocused(false);
		isCompositionRef.current = false;
	};

	const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text/plain");
		if (!pastedText) return;

		const { newLetters } = hasSelection
			? deleteSelectedText()
			: { newLetters: [...letters] };
		const pastedLetters = pastedText.split("");

		const currentCaret = hasSelection
			? [selectionStart!, selectionEnd!].sort((a, b) => a - b)[0]
			: caretIndex;

		newLetters.splice(currentCaret, 0, ...pastedLetters);
		setLetters(newLetters);
		setCaretIndex(currentCaret + pastedLetters.length);
		clearSelection();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "a") {
			e.preventDefault();
			setSelection({ start: 0, end: letters.length });
			return;
		}

		if (e.key === "HangulMode") {
			setHangulMode(!hangulMode);
			// hangulModeRef.current = !hangulModeRef.current;
			return;
		}

		// ✨ Copy (Ctrl+C or Cmd+C)
		if ((e.ctrlKey || e.metaKey) && e.key === "c") {
			if (hasSelection) {
				e.preventDefault();
				const [start, end] = [selectionStart!, selectionEnd!].sort(
					(a, b) => a - b,
				);
				const textToCopy = letters.slice(start, end).join("");
				navigator.clipboard.writeText(textToCopy).catch((err) => {
					console.error("Failed to copy text: ", err);
				});
			}
			return;
		}

		// 복사, 붙여넣기 단축키는 브라우저 기본 동작에 맡기거나 필요시 구현합니다.
		if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "v")) return;

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
			// 다른 제어키들 (동작 없음)

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
				// 문자 입력
				const { newLetters, finalCaretIndex } = hasSelection
					? deleteSelectedText()
					: { newLetters: [...letters], finalCaretIndex: caretIndex };

				let charToInsert = e.key;
				let isComposing = false;

				const prevChar = newLetters[finalCaretIndex - 1];

				if (hangulMode) {
					charToInsert = convertQwertyToHangul(e.key);
					isComposing = true;
				} else if (isHangul(e.key)) {
					isComposing = true;
				}
				if (isComposing && isHangul(prevChar) && isCompositionRef.current) {
					const combined = assemble([prevChar, charToInsert]).split("");
					newLetters.splice(finalCaretIndex - 1, 1, ...combined);
					setLetters(newLetters);
					setCaretIndex(finalCaretIndex - 1 + combined.length);
				} else {
					newLetters.splice(finalCaretIndex, 0, charToInsert);
					setLetters(newLetters);
					setCaretIndex(finalCaretIndex + 1);
				}
				isCompositionRef.current = isComposing;
				break;
			}
		}
	};

	const handleClickWrap = () => {
		clearSelection();
		setCaretIndex(letters.length);
	};

	const handleClickLetter = (index: number) => {
		clearSelection();
		setCaretIndex(index);
	};

	const isSelected = (index: number) => {
		if (!hasSelection) return false;
		const [start, end] = [selectionStart!, selectionEnd!].sort((a, b) => a - b);
		return index >= start && index < end;
	};

	// UI 컴포넌트가 사용할 상태와 함수들을 반환합니다.
	return {
		letters,
		caretIndex,
		isFocused,
		isSelected,
		hasSelection,
		actions: {
			handleFocus,
			handleBlur,
			handleKeyDown,
			handlePaste,
			handleClickWrap,
			handleClickLetter,
		},
	};
}
