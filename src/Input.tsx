/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import {
	useRef,
	useState,
	type InputHTMLAttributes,
	type KeyboardEvent,
	type MouseEvent,
} from "react";
import { ShadowWrapper } from "./ShadowWrapper";
import { BlinkingCaret } from "./BlinkingCaret";
// custom-jsx.d.ts
declare global {
	namespace JSX {
		interface IntrinsicElements {
			div: React.DetailedHTMLProps<
				React.HTMLAttributes<HTMLElement>,
				HTMLElement
			>;
		}
	}
}
export interface InputProps {
	children?: string;
}

export function Input({ children }: InputProps) {
	const [caretIndex, setCaretIndex] = useState<number>(0);
	const [letters, setLetters] = useState(() => children?.split("") ?? []);

	const handleKeyDown = (e: KeyboardEvent) => {
		switch (e.key) {
			case "Backspace": {
				if (caretIndex > 0) {
					const newLetters = [...letters];
					newLetters.splice(caretIndex - 1, 1); // 앞 글자 삭제
					setLetters(newLetters);
					setCaretIndex((i) => i - 1);
				}
				break;
			}
			case "Delete": {
				if (caretIndex < letters.length) {
					const newLetters = [...letters];
					newLetters.splice(caretIndex, 1); // 뒤 글자 삭제
					setLetters(newLetters);
				}
				break;
			}
			case "ArrowLeft": {
				if (caretIndex > 0) {
					setCaretIndex((i) => i - 1);
				}
				break;
			}
			case "ArrowRight": {
				if (caretIndex < letters.length) {
					setCaretIndex((i) => i + 1);
				}
				break;
			}
			case "Shift":
			case "CapsLock":
			case "Control":
			case "Alt":
			case "Meta":
			case "Enter":
			case "ArrowDown": {
				e.stopPropagation();
				break;
			}
			default: {
				const newLetters = [...letters];
				newLetters.splice(caretIndex, 0, e.key);
				setLetters(newLetters);
				setCaretIndex((i) => i + 1);
				return;
			}
		}
	};

	const handleClickWrap = () => {
		setCaretIndex(letters.length);
	};
	const handleClickLetter = (e: MouseEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		const target = e.target;
		if (target instanceof HTMLSpanElement)
			setCaretIndex(Number(target.dataset.value));
	};
	return (
		<ShadowWrapper
			css={`
				.wrap {
					position: relative;
					cursor: text;
					padding: 0;
				}
				.letter {
					position: relative;
					font-style: normal;
					white-space: pre;
				}
				.cursor-area {
					z-index: 1;
					position: absolute;
					width: 100%;
					height: 100%;
					top: 0;
					right: 50%;
				}
			`}
		>
			<div
				className="wrap"
				role="button"
				tabIndex={0}
				contentEditable={false}
				onKeyDown={handleKeyDown}
				onClick={handleClickWrap}
			>
				{letters.flatMap((x, i) => {
					const item = (
						<span key={`char-${i}`} className="letter">
							{x}
							<span
								className="cursor-area"
								role="button"
								tabIndex={0}
								onClick={handleClickLetter}
								data-value={i}
							/>
						</span>
					);
					const caret =
						caretIndex === i ? <BlinkingCaret key={`caret-${i}`} /> : null;
					return [caret, item];
				})}
				{/* 마지막 글자 뒤에 커서 */}
				{caretIndex === letters.length && <BlinkingCaret />}
			</div>
		</ShadowWrapper>
	);
}
