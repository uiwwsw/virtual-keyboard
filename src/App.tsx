import { useRef, useState } from "react";
import { ComposedInput } from "./ComposedInput";

function Input({ answer }: { answer: string }) {
	const ref = useRef<HTMLInputElement>(null);
	const handleChange = () => {
		if (ref.current?.value === answer) {
		}
	};
	return (
		<ComposedInput
			ref={ref}
			onChange={handleChange}
			maxLength={1}
			className="focus:z-10 border text-center relative w-8 h-8 box-border"
		/>
	);
}
const answer: Record<string, string[]> = {
	"1-2": ["선물", "선물 설명", "v"],
	"1-3": ["물산", "물산 설명", "h"],
};
const keys = Object.keys(answer);
const maps: undefined[][] = Array(10).fill(Array(10).fill(undefined));
function App() {
	const [current, setCurrent] = useState();
	return (
		<>
			<div className="inline-block m-auto w-80 h-80">
				{maps.map((x, i) =>
					x.map((_, j) => {
						const key = `${i}-${j}`;
						return (
							<Input
								answer={answer[key][0]}
								key={keys.includes(key) ? key : "empty"}
							/>
						);
					}),
				)}
			</div>
			<div>
				{Object.entries(answer).map(([key, value]) => (
					<p key={key}>{value[1]}</p>
				))}
			</div>
		</>
	);
}

export default App;
