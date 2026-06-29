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
import selectionModeLayout from "../assets/selectionModeLayout.json";
import { getForcedHangulMode, resolveInputPolicy } from "../utils/inputPolicy";
import type { InputPolicy } from "../types/inputPolicy";
import { useVisualViewport } from "../hooks/useVisualViewport";
import { useSystemTheme } from "../hooks/useSystemTheme";

const GLOBAL_FOCUS_EVENT = "virtual-keyboard:focus-change";
let providerSequence = 0;

type GlobalFocusDetail = {
	providerId: string;
	inputId?: string;
	active: boolean;
};

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
	const [shiftLocked, setShiftLocked] = useState(false);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectionAdjusting, setSelectionAdjusting] = useState(false);
	const [hangulMode, setHangulMode] = useStorage(
		"virtual-keyboard-hangul-mode",
		defaultHangulMode,
	);
	const viewport = useVisualViewport();
	const [activeInputPolicy, setActiveInputPolicy] = useState(() => resolveInputPolicy({ layout }));
	const providerIdRef = useRef(`virtual-input-provider-${++providerSequence}`);

	// Resolve Theme
	const systemTheme = useSystemTheme();
	const effectiveTheme = theme ?? systemTheme;
	const focusedElementRef = useRef<HTMLElement | null>(null);
	const resetKeyboardModes = useCallback(() => {
		setShift(false);
		setShiftLocked(false);
		setSelectionMode(false);
		setSelectionAdjusting(false);
	}, []);

	const clearFocusState = useCallback((shouldBroadcast = false) => {
		focusedElementRef.current = null;
		setFocusId(undefined);
		resetKeyboardModes();
		isCompositionRef.current = false;

		if (shouldBroadcast && typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent<GlobalFocusDetail>(GLOBAL_FOCUS_EVENT, {
					detail: {
						providerId: providerIdRef.current,
						active: false,
					},
				}),
			);
		}
	}, [isCompositionRef, resetKeyboardModes]);

	useEffect(() => {
		if (focusId && focusedElementRef.current) {
			const paddingBottom = Math.round(200 / viewport.scale);
			document.body.style.paddingBottom = `${paddingBottom}px`;

			const frame = window.requestAnimationFrame(() => {
				const el = focusedElementRef.current;
				if (!el) return;

				const rect = el.getBoundingClientRect();
				const topMargin = Math.max(12, Math.round(20 / viewport.scale));
				const bottomMargin = paddingBottom + Math.max(12, Math.round(20 / viewport.scale));
				const visibleTop = viewport.offsetTop + topMargin;
				const visibleBottom = viewport.offsetTop + viewport.height - bottomMargin;

				if (rect.top < visibleTop) {
					window.scrollBy({
						top: rect.top - visibleTop,
						behavior: "auto",
					});
					return;
				}

				if (rect.bottom > visibleBottom) {
					window.scrollBy({
						top: rect.bottom - visibleBottom,
						behavior: "auto",
					});
				}
			});

			return () => {
				window.cancelAnimationFrame(frame);
				document.body.style.paddingBottom = '0px';
			};
		} else {
			document.body.style.paddingBottom = '0px';
		}
		return () => {
			document.body.style.paddingBottom = '0px';
		};
	}, [focusId, viewport.scale, viewport.height, viewport.offsetTop]);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const handleGlobalFocusChange = (event: Event) => {
			const detail = (event as CustomEvent<GlobalFocusDetail>).detail;
			if (!detail || detail.providerId === providerIdRef.current || !detail.active) return;
			clearFocusState(false);
		};

		window.addEventListener(GLOBAL_FOCUS_EVENT, handleGlobalFocusChange as EventListener);
		return () => {
			window.removeEventListener(GLOBAL_FOCUS_EVENT, handleGlobalFocusChange as EventListener);
		};
	}, [clearFocusState]);

	const onFocus = (id: string, target?: HTMLElement | null, policy?: InputPolicy) => {
		clearTimeout(sti.current);
		if (target) focusedElementRef.current = target;
		if (policy) {
			const resolvedPolicy = resolveInputPolicy(policy);
			setActiveInputPolicy(resolvedPolicy);
			const forcedHangulMode = getForcedHangulMode(resolvedPolicy.mode);
			if (forcedHangulMode !== null) {
				setHangulMode(forcedHangulMode);
			}
		}
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent<GlobalFocusDetail>(GLOBAL_FOCUS_EVENT, {
					detail: {
						providerId: providerIdRef.current,
						inputId: id,
						active: true,
					},
				}),
			);
		}
		setFocusId(id);
	};

	const onBlur = useCallback((e?: React.FocusEvent | boolean) => {
		// Force close (from Keypad outside click)
		if (e === true) {
			clearFocusState(true);
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
				clearFocusState(true);
			}, 0);
			return;
		}

		// If tapped background (no related target or body), KEEP OPEN (User request)
		// This is CRITICAL for iOS fast input where focus can be lost transiently.
		// However, Keypad.tsx now handles explicit outside clicks and calls onBlur(true).
	}, [clearFocusState]);
	const toggleShift = useCallback(() => {
		setShift((prevShift) => {
			if (prevShift && shiftLocked) {
				setShiftLocked(false);
				return false;
			}
			if (prevShift) {
				setShiftLocked(true);
				return true;
			}
			setShiftLocked(false);
			return true;
		});
	}, [shiftLocked]);

	const consumeShift = useCallback(() => {
		setShift((prevShift) => {
			if (!prevShift || shiftLocked) return prevShift;
			return false;
		});
		setShiftLocked((prevLocked) => prevLocked);
	}, [shiftLocked]);

	const enterSelectionMode = useCallback(() => {
		setSelectionMode(true);
		setSelectionAdjusting(false);
	}, []);

	const exitSelectionMode = useCallback(() => {
		setSelectionMode(false);
		setSelectionAdjusting(false);
	}, []);

	const toggleSelectionAdjust = useCallback(() => {
		setSelectionAdjusting((prev) => !prev);
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
				shiftLocked,
				selectionMode,
				selectionAdjusting,
				theme: effectiveTheme,
				onFocus,
				onBlur,
				setHangulMode,
				toggleShift,
				consumeShift,
				enterSelectionMode,
				exitSelectionMode,
				toggleSelectionAdjust,
				toggleKorean,
				isCompositionRef,
				inputRef,
				activeInputPolicy,
			}}
		>
			{children}
			<VirtualKeypad layout={selectionMode ? (selectionModeLayout as KeypadLayout) : activeInputPolicy.layout} viewport={viewport} />
		</VirtualInputContext.Provider>
	);
}
