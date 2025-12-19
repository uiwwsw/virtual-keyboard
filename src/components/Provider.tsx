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
import { useSystemTheme } from "../hooks/useSystemTheme";
export function VirtualInputProvider({
	children,
	layout = qwerty,
	defaultHangulMode = true,
	theme, // undefined = auto (defaults to system preference)
}: {
	layout?: KeypadLayout;
	children: ReactNode;
	defaultHangulMode?: boolean;
	theme?: "light" | "dark";
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

	// Resolve Theme
	const systemTheme = useSystemTheme();
	const effectiveTheme = theme ?? systemTheme;
	const focusedElementRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (focusId && focusedElementRef.current) {
			const paddingBottom = Math.round(200 / viewport.scale);
			document.body.style.paddingBottom = `${paddingBottom}px`;

			// Vertical Focus: Scroll input into view (centered in available space)
			setTimeout(() => {
				const el = focusedElementRef.current;
				if (el) {
					const rect = el.getBoundingClientRect();
					const scrollTop = window.scrollY || document.documentElement.scrollTop;
					const elementTop = rect.top + scrollTop;

					// Calculate available height (Visual Viewport - Keypad)
					const availableHeight = viewport.height - paddingBottom;

					// Target: Center the element in the available space
					// ScrollTop = (Element Top) - (Half Available Height) + (Half Element Height)
					const targetScroll = elementTop - (availableHeight / 2) + (rect.height / 2);

					window.scrollTo({
						top: targetScroll,
						behavior: "smooth",
					});
				}
			}, 100);
		} else {
			document.body.style.paddingBottom = '0px';
		}
		return () => {
			document.body.style.paddingBottom = '0px';
		};
	}, [focusId, viewport.scale, viewport.height, viewport.offsetTop]);

	const onFocus = (id: string, target?: HTMLElement | null) => {
		clearTimeout(sti.current);
		if (target) focusedElementRef.current = target;
		setFocusId(id);
	};
	const onBlur = useCallback((e?: React.FocusEvent | boolean) => {
		// Force close (from Keypad outside click)
		if (e === true) {
			setFocusId(undefined);
			isCompositionRef.current = false;
			return;
		}

		// If explicit blur to another element
		if (e && typeof e === 'object' && 'relatedTarget' in e && e.relatedTarget) {
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
		// However, Keypad.tsx now handles explicit outside clicks and calls onBlur(true).
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
				focusId,
				hangulMode,
				shift,
				theme: effectiveTheme,
				onFocus,
				onBlur,
				setHangulMode,
				toggleShift,
				toggleKorean,
				isCompositionRef,
				inputRef,
			}}
		>
			{children}
			<VirtualKeypad layout={layout} viewport={viewport} />
		</VirtualInputContext.Provider>
	);
}

