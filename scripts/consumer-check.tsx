import {
  VirtualInput,
  VirtualInputProvider,
  type KeypadLayout,
  type VirtualInputProps,
} from "@uiwwsw/virtual-keyboard";
const layout: KeypadLayout = [
  [{ value: "010" }, { value: "Backspace", type: "action" }],
];
const props: VirtualInputProps = {
  mode: "tel",
  layout,
  onValueChange: (value) => value.toUpperCase(),
};
export const form = (
  <VirtualInputProvider>
    <VirtualInput {...props} />
  </VirtualInputProvider>
);
