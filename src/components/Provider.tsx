// components/InputProvider.tsx
import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
	useEffect,
} from "react";
import type { InputLogicActions } from "../hooks/useInputLogic";
import { Keyboard } from "./Keyboard";

interface InputContextValue {
	currentInput: InputLogicActions | null;
	register: (target: InputLogicActions) => void;
	unregister: () => void;
}

const InputContext = createContext<InputContextValue | null>(null);

export function InputProvider({ children }: { children: ReactNode }) {
	const [currentInput, setCurrentInput] = useState<InputLogicActions | null>(
		null,
	);

	const register = useCallback(
		(target: InputLogicActions) => {
			if (!currentInput) setCurrentInput(target);
		},
		[currentInput],
	);

	const unregister = useCallback(() => {
		if (currentInput) setCurrentInput(null);
	}, [currentInput]);

	useEffect(() => {
		if (currentInput) {
			currentInput.handleFocus();
		}
	}, [currentInput]);

	return (
		<InputContext.Provider value={{ currentInput, register, unregister }}>
			<>
				{children}
				<Keyboard
					focus={!!currentInput}
					onInput={currentInput?.insertCharacter ?? (() => {})}
					onFocus={currentInput?.handleFocus ?? (() => {})}
					onBlur={currentInput?.handleBlur ?? (() => {})}
				/>
			</>
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
