import { VirtualInput } from "./components/Input";
import { VirtualInputProvider } from "./components/Provider";

function App() {
	return (
		<>
			<VirtualInputProvider>
				<VirtualInput initialValue="가나달" />
				<VirtualInput initialValue="가나달" />
				<VirtualInput initialValue="가나달" />
			</VirtualInputProvider>
			<div>dwadawd</div>
			<input type="text" />
		</>
	);
}

export default App;
