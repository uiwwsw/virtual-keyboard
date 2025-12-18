// components/VirtualInputProvider.tsx
import {
	useState,
	type ReactNode,
	useRef,
	useCallback,
	useEffect,
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
	const isCompositionRef = useRef<boolean | undefined>(undefined);
	const [focusId, setFocusId] = useState<string | undefined>();
	const [shift, setShift] = useState(false);
	const [hangulMode, setHangulMode] = useStorage(
		"virtual-keyboard-hangul-mode",
		defaultHangulMode,
	);
	const viewport = useVisualViewport();

	useEffect(() => {
		if (focusId) {
			document.body.style.paddingBottom = `${Math.round(200 / viewport.scale)}px`;
		} else {
			document.body.style.paddingBottom = '0px';
		}
		return () => {
			document.body.style.paddingBottom = '0px';
		};
	}, [focusId, viewport.scale]);

	const onFocus = (id: string) => {
		clearTimeout(sti.current);
		setFocusId(id);
	};
	const onBlur = useCallback((e?: React.FocusEvent) => {
		// If explicit blur to another element
		if (e?.relatedTarget) {
			// If related target is a virtual input, don't close (let new input focus handle it)
			if ((e.relatedTarget as HTMLElement).getAttribute("data-virtual-input")) {
				return;
			}
			// If focused to valid non-virtual element, close
			sti.current = setTimeout(() => {
				setFocusId(undefined);
				isCompositionRef.current = false;
			}, 0);
			return;
		}

		// If tapped background (no related target or body), KEEP OPEN (User request)
		// This is CRITICAL for iOS fast input where focus can be lost transiently.
	}, [setFocusId, isCompositionRef]);
	const toggleShift = useCallback(() => {
		setShift((prev) => !prev);
	}, []);

	const toggleKorean = useCallback(() => {
		setHangulMode((prev) => !prev);
	}, [setHangulMode]);
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
