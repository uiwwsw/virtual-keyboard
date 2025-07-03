/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import {
	useState,
	type KeyboardEvent,
	type MouseEvent,
	type ClipboardEvent,
	useRef,
} from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { BlinkingCaret } from "./BlinkingCaret";
import { assemble, convertQwertyToHangul } from "es-hangul";
import { isHangul } from "../utils/isHangul";
import { Keyboard } from "./Keyboard";

export interface InputProps {
	children?: string;
}
export function Input({ children }: InputProps) {
	// TODO storage에 저장,
	// TODO 초기에 한글인지 알 수 있는 방법은...?
	const hangulModeRef = useRef(false);
	const isCompositionRef = useRef(false);
	const [focus, setFocus] = useState<boolean>();
	const [caretIndex, setCaretIndex] = useState<number>(0);
	const [letters, setLetters] = useState(() => children?.split("") ?? []);
	// const adapterLetters = useMemo(
	// 	() => (letters ? assemble(letters).split("") : []),
	// 	[letters],
	// );

	const [isAllSelected, setIsAllSelected] = useState(false);
	const handleFocus = () => setFocus(true);
	const handleBlur = () => setFocus(false);
	const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
		e.preventDefault();
		const pastedText = e.clipboardData.getData("text/plain");
		if (!pastedText) return;

		const pastedLetters = pastedText.split("");
		let newLetters: string[];
		let newCaretIndex: number;

		if (isAllSelected) {
			newLetters = pastedLetters;
			newCaretIndex = pastedLetters.length;
		} else {
			newLetters = [
				...letters.slice(0, caretIndex),
				...pastedLetters,
				...letters.slice(caretIndex),
			];
			newCaretIndex = caretIndex + pastedLetters.length;
		}

		setLetters(newLetters);
		setCaretIndex(newCaretIndex);
		setIsAllSelected(false);
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		// Select All (Ctrl+A or Cmd+A)
		if (e.key === "HangulMode") {
			hangulModeRef.current = !hangulModeRef.current;
			return;
		}

		if ((e.ctrlKey || e.metaKey) && e.key === "a") {
			e.preventDefault();
			setIsAllSelected(true);
			return;
		}
		// ✨ Copy (Ctrl+C or Cmd+C)
		if ((e.ctrlKey || e.metaKey) && e.key === "c") {
			if (isAllSelected) {
				e.preventDefault();
				const textToCopy = letters.join("");
				navigator.clipboard.writeText(textToCopy).catch((err) => {
					console.error("Failed to copy text: ", err);
				});
			}
			return; // 복사 후 다른 동작을 막기 위해 return
		}
		if ((e.ctrlKey || e.metaKey) && e.key === "v") return;

		if (isAllSelected) {
			isCompositionRef.current = false;

			// On any key press while all is selected, replace or delete content.
			switch (e.key) {
				case "Backspace":
				case "Delete": {
					setLetters([]);
					setCaretIndex(0);
					setIsAllSelected(false);
					break;
				}
				case "Shift":
				case "CapsLock":
				case "Control":
				case "Alt":
				case "Meta":
				case "Enter":
				case "ArrowUp":
				case "ArrowDown":
				case "ArrowLeft":
				case "ArrowRight": {
					// Do nothing for control keys
					e.stopPropagation();
					break;
				}
				default: {
					// Replace content with the new character
					setLetters([e.key]);
					setCaretIndex(1);
					setIsAllSelected(false);
					break;
				}
			}
			return;
		}

		// Default behavior when not all is selected
		switch (e.key) {
			case "Backspace": {
				isCompositionRef.current = false;

				if (caretIndex > 0) {
					const newLetters = [...letters];
					newLetters.splice(caretIndex - 1, 1);
					setLetters(newLetters);
					setCaretIndex((i) => i - 1);
				}
				break;
			}
			case "Delete": {
				isCompositionRef.current = false;

				if (caretIndex < letters.length) {
					const newLetters = [...letters];
					newLetters.splice(caretIndex, 1);
					setLetters(newLetters);
				}
				break;
			}
			case "ArrowLeft": {
				isCompositionRef.current = false;

				if (caretIndex > 0) {
					setCaretIndex((i) => i - 1);
				}
				setIsAllSelected(false); // Deselect
				break;
			}
			case "ArrowRight": {
				isCompositionRef.current = false;

				if (caretIndex < letters.length) {
					setCaretIndex((i) => i + 1);
				}
				setIsAllSelected(false); // Deselect
				break;
			}
			case "Tab":
			case "Shift":
			case "CapsLock":
			case "Control":
			case "Alt":
			case "Meta":
			case "Enter":
			case "ArrowUp":
			case "ArrowDown": {
				e.stopPropagation();
				break;
			}
			default: {
				const newLetters = [...letters];
				const prevChar = newLetters[caretIndex - 1];

				if (hangulModeRef.current) {
					const key = convertQwertyToHangul(e.key);
					if (isHangul(prevChar)) {
						newLetters.splice(caretIndex - 1, 1);
						const combined = assemble([prevChar, key]);
						const combinedLetters = combined.split("");
						newLetters.splice(caretIndex - 1, 0, ...combinedLetters);
						setCaretIndex(caretIndex - 1 + combinedLetters.length);
					} else {
						newLetters.splice(caretIndex, 0, key);
						setCaretIndex((i) => i + 1);
					}
					isCompositionRef.current = true;
				} else if (
					isHangul(e.key) &&
					isHangul(prevChar) &&
					isCompositionRef.current
				) {
					newLetters.splice(caretIndex - 1, 1);
					const combined = assemble([prevChar, e.key]);
					const combinedLetters = combined.split("");
					newLetters.splice(caretIndex - 1, 0, ...combinedLetters);
					setCaretIndex(caretIndex - 1 + combinedLetters.length);
				} else {
					newLetters.splice(caretIndex, 0, e.key);
					setCaretIndex((i) => i + 1);
				}

				isCompositionRef.current = isHangul(e.key);
				setLetters(newLetters);
				break;
			}
		}
	};

	const handleClickWrap = () => {
		setIsAllSelected(false); // Deselect on click
		setCaretIndex(letters.length);
	};

	const handleClickLetter = (e: MouseEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		setIsAllSelected(false); // Deselect on click
		const target = e.target;
		if (target instanceof HTMLSpanElement) {
			setCaretIndex(Number(target.dataset.value));
		}
	};

	return (
		<ShadowWrapper
			css={`
        .wrap {
          position: relative;
          cursor: text;
          padding: 0;
          background-color: #f0f0f0; /* Added a background for better visibility */
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 4px;
        }
        .wrap::before {
          content: "";
          height: 1em;
          display: inline-block;
        }
        .wrap:focus {
          outline: 2px solid #007bff; /* Focus indicator */
          border-color: #007bff;
        }
        .letter {
          position: relative;
          font-style: normal;
          white-space: pre;
        }
        .letter.selected {
          background-color: #b4d5fe; /* Visual feedback for selection */
        }
        .cursor-area {
          z-index: 1;
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0; /* Changed from right: 50% for better click accuracy */
        }
      `}
		>
			<div
				className="wrap"
				role="button" // Changed role for better accessibility
				tabIndex={0}
				onFocus={handleFocus}
				onBlur={handleBlur}
				onKeyDown={handleKeyDown}
				onClick={handleClickWrap}
				onPaste={handlePaste} // Added paste handler
			>
				{letters.flatMap((x, i) => {
					const item = (
						<span
							key={`char-${i}`}
							role="button"
							tabIndex={-1}
							data-value={i}
							onClick={handleClickLetter}
							className={`letter ${isAllSelected ? "selected" : ""}`}
						>
							{x}
						</span>
					);
					const caret =
						caretIndex === i && !isAllSelected && focus ? (
							<BlinkingCaret key={`caret-${caretIndex}-${i}`} />
						) : null;
					return [caret, item];
				})}

				{caretIndex === letters.length && !isAllSelected && focus && (
					<BlinkingCaret />
				)}
			</div>
			<Keyboard focus={focus} />
		</ShadowWrapper>
	);
}
