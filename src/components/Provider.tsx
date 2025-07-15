// components/VirtualInputProvider.tsx
import {
	useState,
	type ReactNode,
	useRef, // Import useRef
	useCallback,
} from "react";
import { VirtualKeypad, type VirtualKeypadName } from "./Keypad";

export type VirtualKeypadName = "newqwerty";
import { useStorage } from "../hooks/useStorage";
import { VirtualInputContext } from "./Context";
import type { VirtualInputHandle } from "./Input";

export function VirtualInputProvider({
	children,
	defaultHangulMode = true,
	defaultLayout = "newqwerty",
}: {
	children: ReactNode;
	defaultHangulMode?: boolean;
	defaultLayout?: VirtualKeypadName;
}) {
	const inputRef = useRef<VirtualInputHandle>(null);
	const sti = useRef(setTimeout(() => null, 0));
	const [focusId, setFocusId] = useState<string | undefined>();
	const shiftRef = useRef(false);
	const [hangulMode, setHangulMode] = useStorage(
		"virtual-keyboard-hangul-mode",
		defaultHangulMode,
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
	const toggleShift = useCallback(() => {
		shiftRef.current = !shiftRef.current;
	}, []);
	const isCompositionRef = useRef<boolean | undefined>(undefined);
	return (
		<VirtualInputContext.Provider
			value={{
				inputRef,
				isCompositionRef,
				onFocus,
				onBlur,
				focusId,
				setHangulMode,
				hangulMode,
				shiftRef,
				toggleShift,
			}}
		>
			{children}
			<VirtualKeypad defaultLayout={defaultLayout} />
		</VirtualInputContext.Provider>
	);
}
