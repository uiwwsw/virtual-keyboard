import { useRef, type ChangeEvent } from "react";

import { ComposedInput } from "./ComposedInput";
import { generateCrossword } from "./generateCrossword";

const myWords = [
	"타입스크립트",
	"알고리즘",
	"크로스워드",
	"리액트",
	"자바스크립트",
	"개발자",
	"즘스",
	"호두",
	"알리",
];

const crosswordMap = generateCrossword(myWords);

const coll = crosswordMap[0].length ?? 1;

function Input({
	index,
	wrapRef,
	answer,
}: {
	answer?: string;
	index: number;
	wrapRef: React.RefObject<HTMLDivElement | null>;
}) {
	const ref = useRef<HTMLInputElement>(null);
	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		if (answer === e.target.value) {
			if (ref.current) {
				ref.current.readOnly = true;
				ref.current.style.background = "red";
				const nextInput = wrapRef.current?.children[index + 1];
				if (
					nextInput instanceof HTMLInputElement &&
					nextInput.dataset.id !== "empty"
				)
					nextInput.focus();
			}
		}
	};
	return (
		<ComposedInput
			ref={ref}
			disabled={!answer}
			data-id={answer ? null : "empty"}
			onChange={handleChange}
			maxLength={1}
			className={`focus:z-10 border text-center relative w-8 h-8 box-border${!answer ? " bg-zinc-800" : ""}`}
		/>
	);
}

function App() {
	const ref = useRef<HTMLDivElement>(null);
	return (
		<>
			<div className="m-auto" ref={ref} style={{ width: 32 * coll }}>
				{crosswordMap.map((x, i) =>
					x.map((y, j) => {
						const key = `${i}-${j}`;
						return (
							<Input
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
