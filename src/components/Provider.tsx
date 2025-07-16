// components/VirtualInputProvider.tsx
import {
	useState,
	type ReactNode,
	useRef, // Import useRef
	useCallback,
} from "react";
import { VirtualKeypad, type KeypadLayout } from "./Keypad";
import { useStorage } from "../hooks/useStorage";
import { VirtualInputContext } from "./Context";
import type { VirtualInputHandle } from "./Input";
import qwerty from "../assets/qwerty.json";
import { useVisualViewport } from "../hooks/useVisualViewport";
export function VirtualInputProvider({
	children,
	layout = qwerty,
	defaultHangulMode = true,
}: {
	layout?: KeypadLayout;
	children: ReactNode;
	defaultHangulMode?: boolean;
}) {
	const inputRef = useRef<VirtualInputHandle>(null);
	const sti = useRef(setTimeout(() => null, 0));
	const [focusId, setFocusId] = useState<string | undefined>();
	const [shift, setShift] = useState(false);
	const [hangulMode, setHangulMode] = useStorage(
		"virtual-keyboard-hangul-mode",
		defaultHangulMode,
	);
	const viewport = useVisualViewport();

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
		setShift((prev) => !prev);
	}, []);

	const toggleKorean = useCallback(() => {
		setHangulMode((prev) => !prev);
	}, [setHangulMode]);
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
				shift,
				toggleShift,
				toggleKorean,
			}}
		>
			{children}
			<VirtualKeypad layout={layout} viewport={viewport} />
		</VirtualInputContext.Provider>
	);
}
