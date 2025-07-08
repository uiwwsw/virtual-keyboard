// components/Input.tsx
import { useEffect } from "react";
import { useInputLogic, type UseInputLogicProps } from "../hooks/useInputLogic";
import { useInputContext } from "./Provider";
import { ShadowWrapper } from "./ShadowWrapper";
import { BlinkingCaret } from "./BlinkingCaret";

export interface InputProps extends UseInputLogicProps {
	// children?: string; // initialValue로 대체
}

export function Input({ initialValue = "" }: InputProps) {
	const { letters, caretIndex, isFocused, isSelected, hasSelection, actions } =
		useInputLogic({ initialValue });
	const { register, unregister, currentInput } = useInputContext();

	useEffect(() => {
		if (isFocused) {
			register(actions);
		} else {
			unregister();
		}
	}, [isFocused, actions, register, unregister]);

	const handleClickLetter = (e: React.MouseEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		actions.handleClickLetter(Number(e.currentTarget.dataset.value));
	};

	return (
		<ShadowWrapper
			tagName={"virtual-keyboard" as "input"}
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
				onFocus={actions.handleFocus}
				onBlur={actions.handleBlur}
				onKeyDown={actions.handleKeyDown}
				onClick={actions.handleClickWrap}
				onPaste={actions.handlePaste}
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
							onClick={handleClickLetter}
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
