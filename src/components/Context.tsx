import {
  createContext,
  type Dispatch,
  type SetStateAction,
  type RefObject,
  useContext,
} from "react";
interface InputContextValue {
  isCompositionRef: RefObject<boolean>;
  setIsFocused: Dispatch<SetStateAction<boolean>>;
  isFocused: boolean;
  setHangulMode: Dispatch<SetStateAction<boolean>>;
  hangulMode: boolean;
}
export const InputContext = createContext<InputContextValue | null>(null);

export function useInputContext() {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error(
      "Input must be used within an <InputProvider>. Wrap your app with <InputProvider>."
    );
  }
  return context;
}
