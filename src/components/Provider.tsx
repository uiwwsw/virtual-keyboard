// components/InputProvider.tsx
import {
  useState,
  type ReactNode,
  useRef, // Import useRef
} from "react";
import { Keyboard } from "./Keyboard";
import { useStorage } from "../hooks/useStorage";
import { InputContext } from "./Context";
import type { InputHandle } from "./Input";

export function InputProvider({
  children,
  defaultHangulMode = true,
}: {
  children: ReactNode;
  defaultHangulMode?: boolean;
}) {
  const inputRef = useRef<InputHandle>(null);
  const sti = useRef(setTimeout(() => null, 0));
  const [focusId, setFocusId] = useState<string | undefined>();

  const [hangulMode, setHangulMode] = useStorage(
    "virtual-hangul-mode",
    defaultHangulMode
  );
  const onFocus = (id: string) => {
    clearTimeout(sti.current);
    setFocusId(id);
  };
  const onBlur = () => {
    sti.current = setTimeout(() => {
      setFocusId(undefined);
      isCompositionRef.current = false;
    }, 0);
  };

  const isCompositionRef = useRef(false);
  return (
    <InputContext.Provider
      value={{
        inputRef,
        isCompositionRef,
        onFocus,
        onBlur,
        focusId,
        setHangulMode,
        hangulMode,
      }}
    >
      {children}
      <Keyboard />
    </InputContext.Provider>
  );
}
