import { useRef, useState, type ChangeEvent, type FocusEvent } from "react";

import { ComposedInput } from "./ComposedInput";
import { generateCrossword } from "./generateCrossword";

const myWords = [
	"타입스크립트",
	"알고리즘",
	"크로스워드",
	"리액트",
	"자바스크립트입니다",
	"개발자",
	"알리",
	"타바나",
	"립제이",
	"이거뭔데",
];

const crosswordMap = generateCrossword(myWords);

const coll = crosswordMap[0].length ?? 1;

function Input({
	index,
	wrapRef,
	direct,
	answer,
	onToggle,
}: {
	onToggle: () => unknown;
	direct: boolean;
	answer?: string;
	index: number;
	wrapRef: React.RefObject<HTMLDivElement | null>;
}) {
	const ref = useRef<HTMLInputElement>(null);
	// const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
	// 	// 현재 클릭된 input
	// 	const input = e.currentTarget;

	// 	if (document.activeElement === input) {
	// 		onToggle();
	// 	}
	// };
	const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
		if (e.target.dataset.id === "empty") return;

		if (e.target.readOnly) {
			const nextInput = wrapRef.current?.children[index + (direct ? 1 : coll)];
			if (nextInput instanceof HTMLInputElement)
				if (nextInput.dataset.id !== "empty") nextInput.focus();
		}
	};
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (answer === e.target.value) {
			if (ref.current) {
				ref.current.readOnly = true;
				ref.current.style.background = "red";
				const nextInput =
					wrapRef.current?.children[index + (direct ? 1 : coll)];
				if (nextInput instanceof HTMLInputElement) {
					if (nextInput.dataset.id !== "empty") nextInput.focus();
					else {
						onToggle();
						(
							wrapRef.current?.children[
								index + (!direct ? 1 : coll)
							] as HTMLInputElement
						).focus();
					}
				}
			}
		}
	};
	return (
		<ComposedInput
			ref={ref}
			onFocus={handleFocus}
			placeholder={answer}
			disabled={!answer}
			data-id={answer ? null : "empty"}
			onChange={handleChange}
			maxLength={1}
			className={`focus:z-10 border text-center relative w-8 h-8 box-border${!answer ? " bg-zinc-800" : ""}`}
		/>
	);
}

function App() {
	const [direct, setDirect] = useState(true);
	const ref = useRef<HTMLDivElement>(null);
	return (
		<>
			<div className="m-auto" ref={ref} style={{ width: 32 * coll }}>
				{crosswordMap.map((x, i) =>
					x.map((y, j) => {
						const key = `${i}-${j}`;
						return (
							<Input
								onToggle={() => setDirect(!direct)}
								direct={direct}
								answer={y}
								index={i * coll + j}
								key={y ? key : "empty"}
								wrapRef={ref}
							/>
						);
					}),
				)}
			</div>
		</>
	);
}

export default App;
