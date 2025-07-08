import { Input } from "./components/Input";
import { InputProvider } from "./components/Provider";

function App() {
	return (
		<>
			<InputProvider>
				<Input initialValue="가나달" />
				<Input initialValue="가나달" />
				<Input initialValue="가나달" />
			</InputProvider>
			<div>dwadawd</div>
			<input type="text" />
		</>
	);
}

export default App;
