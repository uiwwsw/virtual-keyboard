// components/InputProvider.tsx
import {
  useState,
  type ReactNode,
  useRef, // Import useRef
} from "react";
import { Keyboard } from "./Keyboard";
import { useStorage } from "../hooks/useStorage";
import { InputContext } from "./Context";

export function InputProvider({
  children,
  defaultHangulMode = true,
}: {
  children: ReactNode;
  defaultHangulMode?: boolean;
}) {
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const [hangulMode, setHangulMode] = useStorage(
    "virtual-hangul-mode",
    defaultHangulMode
  );

  const isCompositionRef = useRef(false);
  return (
    <InputContext.Provider
      value={{
        isCompositionRef,
        setIsFocused,
        isFocused,
        setHangulMode,
        hangulMode,
      }}
    >
      <>
        {children}
        <Keyboard />
      </>
    </InputContext.Provider>
  );
}
