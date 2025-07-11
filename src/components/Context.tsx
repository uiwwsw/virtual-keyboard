import {
	createContext,
	type Dispatch,
	type SetStateAction,
	type RefObject,
	useContext,
} from "react";
import type { VirtualInputHandle } from "./Input";
interface VirtualInputContextValue {
	inputRef: RefObject<VirtualInputHandle | null>;
	isCompositionRef: RefObject<boolean | undefined>;
	onFocus: (id: string) => void;
	onBlur: () => void;
	focusId: string | undefined;
	setHangulMode: Dispatch<SetStateAction<boolean>>;
	hangulMode: boolean;
}
export const VirtualInputContext =
	createContext<VirtualInputContextValue | null>(null);

export function useVirtualInputContext() {
	const context = useContext(VirtualInputContext);
	if (!context) {
		throw new Error(
			"Input must be used within an <VirtualInputProvider>. Wrap your app with <VirtualInputProvider>.",
		);
	}
	return context;
}
