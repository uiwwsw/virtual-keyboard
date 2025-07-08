import { Input } from "./components/Input";
import { InputProvider } from "./components/Provider";

function App() {
	return (
		<>
			<InputProvider>
				<Input>가나다</Input>
			</InputProvider>
			<div>dwadawd</div>
			<input type="text" />
		</>
	);
}

export default App;
