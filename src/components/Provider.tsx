// components/InputProvider.tsx
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";
import type { InputLogicActions } from "../hooks/useInputLogic";
import { Keyboard } from "./Keyboard";

interface InputContextValue {
	register: (target: InputLogicActions) => void;
	unregister: () => void;
}

const InputContext = createContext<InputContextValue | null>(null);

export function InputProvider({ children }: { children: ReactNode }) {
	// Use useRef to store the actions of the currently focused input
	const currentInputActionsRef = useRef<InputLogicActions | null>(null);
	const [isInputFocused, setIsInputFocused] = useState(false); // To trigger Keyboard re-render when focus changes

	const register = useCallback((target: InputLogicActions) => {
		currentInputActionsRef.current = target;
		setIsInputFocused(true);
	}, []);

	const unregister = useCallback(() => {
		currentInputActionsRef.current = null;
		setIsInputFocused(false); // Indicate that no input is focused
	}, []);

	// useEffect(() => {
	// 	// This useEffect is for handling initial focus when an input registers
	// 	// and for ensuring handleFocus is called on the newly focused input.
	// 	// It should not be triggered by every input.
	// 	if (currentInputActionsRef.current && isInputFocused) {
	// 		currentInputActionsRef.current.handleFocus();
	// 	}
	// }, [isInputFocused]); // Only re-run when focus state changes

	return (
		<InputContext.Provider value={{ register, unregister }}>
			{children}
			{isInputFocused && (
				<Keyboard
					onInput={currentInputActionsRef.current?.insertCharacter}
					onFocus={currentInputActionsRef.current?.handleFocus}
					onBlur={currentInputActionsRef.current?.handleBlur}
				/>
			)}
		</InputContext.Provider>
	);
}

export function useInputContext() {
	const context = useContext(InputContext);
	if (!context) {
		throw new Error(
			"Input must be used within an <InputProvider>. Wrap your app with <InputProvider>.",
		);
	}
	return context;
}
