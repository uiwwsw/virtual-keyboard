import { VirtualInput } from "./components/Input";
import { VirtualInputProvider } from "./components/Provider";

function App() {
  return (
    <>
      <VirtualInputProvider>
        <VirtualInput defaultValue="가나달" />
      </VirtualInputProvider>
      <VirtualInputProvider
        layout={[
          [
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3" },
          ],
          [
            { value: "4", label: "4" },
            { value: "5", label: "5" },
            { value: "6", label: "6" },
          ],
          [
            { value: "7", label: "7" },
            { value: "8", label: "8" },
            { value: "9", label: "9" },
          ],
          [
            { value: "010", label: "010" },
            { value: "0", label: "0" },
            { label: "del", value: "Backspace", type: "action" },
          ],
        ]}
      >
        <VirtualInput placeholder="123123" />
      </VirtualInputProvider>
      <div>dwadawd</div>
      <input type="text" />
    </>
  );
}

export default App;
