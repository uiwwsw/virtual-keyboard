import { ComposedInput } from "./ComposedInput";

function Input() {
	return (
		<ComposedInput className="focus:z-10 border text-center relative w-8 h-8 box-border" />
	);
}
const answer = {
	"1-2-v": ["선물", "선물 설명"],
	"1-3-h": ["물산", "물산 설명"],
};
const maps: undefined[][] = Array(10).fill(Array(10).fill(undefined));
function App() {
	return (
		<>
			<div className="inline-block m-auto w-80 h-80">
				{maps.map((x, i) => x.map((_, j) => <Input key={`${i}-${j}`} />))}
			</div>
			<div>
				{Object.entries(answer).map(([key, value]) => (
					<p key={key}>{value}</p>
				))}
			</div>
		</>
	);
}

export default App;
