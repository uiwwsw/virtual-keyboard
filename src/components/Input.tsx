// /components/Input/Input.tsx
/** biome-ignore-all lint/suspicious/noArrayIndexKey: <explanation> */
/** biome-ignore-all lint/a11y/useSemanticElements: <explanation> */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: <explanation> */
import type { MouseEvent } from "react";
import { ShadowWrapper } from "./ShadowWrapper"; // 경로에 맞게 수정
import { BlinkingCaret } from "./BlinkingCaret"; // 경로에 맞게 수정
import { Keyboard } from "./Keyboard"; // 경로에 맞게 수정
import { useInputLogic, type UseInputLogicProps } from "../hooks/useInputLogic";
// import { useStorage } from "../hooks/useStorage";

export interface InputProps extends UseInputLogicProps {
	children?: string; // children을 initialValue로 사용하기 위해 유지
}

export function Input({ children }: InputProps) {
	const { letters, caretIndex, isFocused, isSelected, hasSelection, actions } =
		useInputLogic({ initialValue: children });

	const handleClickLetter = (e: MouseEvent<HTMLSpanElement>) => {
		e.stopPropagation();
		const target = e.currentTarget;
		actions.handleClickLetter(Number(target.dataset.value));
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
				role="textbox" // 시맨틱한 역할 부여
				tabIndex={0}
				onFocus={actions.handleFocus}
				onBlur={actions.handleBlur}
				onKeyDown={actions.handleKeyDown}
				onClick={actions.handleClickWrap}
				onPaste={actions.handlePaste}
			>
				{letters.map((char, i) => (
					// map의 두 번째 인자 key 사용 지양을 위해 char와 index 조합
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
			<Keyboard focus={isFocused} onInput={actions.handleClick} />
		</ShadowWrapper>
	);
}
