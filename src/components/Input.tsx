/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import {
	useState,
	type KeyboardEvent,
	type MouseEvent,
	type ClipboardEvent,
	useRef,
	useEffect,
} from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { BlinkingCaret } from "./BlinkingCaret";
import { Keyboard } from "./Keyboard";
import { KeyInputManager } from "../libs/KeyInputManager";

export interface InputProps {
	children?: string;
}
export function Input({ children }: InputProps) {
	// TODO storage에 저장,
	// TODO 초기에 한글인지 알 수 있는 방법은...?
	const hangulModeRef = useRef(false);
	const [focus, setFocus] = useState<boolean>();
	const [caretIndex, setCaretIndex] = useState<number>(0);
	const [letters, setLetters] = useState(children);
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

		let newLetters: string;
		let newCaretIndex: number;

		if (isAllSelected) {
			newLetters = pastedText;
			newCaretIndex = pastedText.length;
		} else {
			newLetters = `${letters?.substring(0, caretIndex)}${pastedText}${letters?.substring(caretIndex)}`;

			newCaretIndex = caretIndex + pastedText.length;
		}

		setLetters(newLetters);
		setCaretIndex(newCaretIndex);
		setIsAllSelected(false);
	};

	const handleClickWrap = () => {
		setIsAllSelected(false); // Deselect on click
		setCaretIndex(letters?.length ?? 0);
	};

	const handleClickLetter = (e: MouseEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		setIsAllSelected(false); // Deselect on click
		const target = e.target;
		if (target instanceof HTMLSpanElement) {
			setCaretIndex(Number(target.dataset.value));
		}
	};
	const managerRef = useRef<KeyInputManager>(null);

	useEffect(() => {
		managerRef.current = new KeyInputManager({
			letters,
			caretIndex,
			hangulMode: hangulModeRef.current,
			isAllSelected,
			onUpdate: ({ letters, caretIndex, isAllSelected }) => {
				setLetters(letters);
				setCaretIndex(caretIndex);
				setIsAllSelected(isAllSelected ?? false);
			},
		});
	}, [letters, caretIndex, isAllSelected]);

	const handleKeyDown = (e: KeyboardEvent) => {
		managerRef.current?.handleKeyDown(e);
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
				{letters}
			</div>
			<Keyboard focus={focus} />
		</ShadowWrapper>
	);
}
