import { useCallback, useRef, useMemo } from "react";
import type { KeyBounds } from "./useKeypadLayout";
import type { VirtualInputHandle } from "../components/Input";

type ActivePress = {
    pointerId: number;
    value: string;
    type?: string;
    repeatTimeout?: number;
    keyIndex: number;
};

type VirtualInputContextType = {
    inputRef: React.RefObject<VirtualInputHandle | null>;
    toggleShift: () => void;
    toggleKorean: () => void;
    shift: boolean;
};

export function useKeypadInteraction({
    inputRef,
    toggleShift,
    toggleKorean,
    shift,
    getTransformedValue,
    keyBoundsRef
}: VirtualInputContextType & {
    getTransformedValue: (cell: { label?: string; value: string; type?: string }) => string;
    keyBoundsRef: React.MutableRefObject<KeyBounds[]>;
}) {
    const activePresses = useRef<Map<number, ActivePress>>(new Map());

    const repeatableKeys = useMemo(
        () => new Set(["char", "Backspace", "Delete", "Space", "ArrowLeft", "ArrowRight"]),
        [],
    );

    const dispatchKeyEvent = useCallback(
        (value: string, type?: string) => {
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
                navigator.vibrate?.(10);
            }

            if (type === "action") {
                if (value === "Shift") {
                    toggleShift();
                    return;
                }
                if (value === "HangulMode") {
                    toggleKorean();
                    return;
                }
            }

            const event = new KeyboardEvent("keydown", {
                key: getTransformedValue({ value, type }),
                code: `Key${value.toUpperCase()}`,
                bubbles: true,
                cancelable: true,
                shiftKey: shift,
            });
            inputRef.current?.handleKeyDown(event);
        },
        [getTransformedValue, inputRef, shift, toggleKorean, toggleShift],
    );

    const clearRepeat = useCallback((press: ActivePress | undefined) => {
        if (!press?.repeatTimeout) return;
        window.clearTimeout(press.repeatTimeout);
    }, []);

    const startRepeat = useCallback(
        (press: ActivePress) => {
            const canRepeat =
                (press.type && repeatableKeys.has(press.type)) ||
                repeatableKeys.has(press.value);

            if (!canRepeat) return;

            const firstDelay = 300;
            const repeatInterval = 60;

            const tick = () => {
                const storedPress = activePresses.current.get(press.pointerId);
                if (!storedPress) return;
                dispatchKeyEvent(storedPress.value, storedPress.type);
                storedPress.repeatTimeout = window.setTimeout(tick, repeatInterval);
                activePresses.current.set(press.pointerId, storedPress);
            };

            press.repeatTimeout = window.setTimeout(tick, firstDelay);
            activePresses.current.set(press.pointerId, press);
        },
        [dispatchKeyEvent, repeatableKeys],
    );

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = e.currentTarget;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Hit test
        const hitKey = keyBoundsRef.current.find(k =>
            x >= k.x && x <= k.x + k.w &&
            y >= k.y && y <= k.y + k.h
        );

        if (hitKey) {
            const keyIndex = hitKey.rowIndex * 100 + hitKey.colIndex;
            dispatchKeyEvent(hitKey.value, hitKey.type); // Trigger immediately

            const press: ActivePress = {
                pointerId: e.pointerId,
                value: hitKey.value,
                type: hitKey.type,
                keyIndex
            };

            activePresses.current.set(e.pointerId, press);
            startRepeat(press);
        }
    }, [dispatchKeyEvent, startRepeat, keyBoundsRef]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent scrolling/gestures on iOS
        const press = activePresses.current.get(e.pointerId);
        if (!press) return;

        const canvas = e.currentTarget;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hitKey = keyBoundsRef.current.find(k =>
            x >= k.x && x <= k.x + k.w &&
            y >= k.y && y <= k.y + k.h
        );

        if (hitKey) {
            const newKeyIndex = hitKey.rowIndex * 100 + hitKey.colIndex;
            if (newKeyIndex !== press.keyIndex) {
                // Switch key
                clearRepeat(press);

                // Start new
                dispatchKeyEvent(hitKey.value, hitKey.type);
                const newPress: ActivePress = {
                    pointerId: e.pointerId,
                    value: hitKey.value,
                    type: hitKey.type,
                    keyIndex: newKeyIndex
                };
                activePresses.current.set(e.pointerId, newPress);
                startRepeat(newPress);
            }
        } else {
            // Moved to void
            clearRepeat(press);
            activePresses.current.delete(e.pointerId); // Remove press tracking if moved out
        }
    }, [clearRepeat, dispatchKeyEvent, startRepeat, keyBoundsRef]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        e.preventDefault(); // Prevent ghost clicks/focus changes
        const press = activePresses.current.get(e.pointerId);
        if (press) {
            clearRepeat(press);
            activePresses.current.delete(e.pointerId);
        }
    }, [clearRepeat]);

    return {
        activePresses,
        handlePointerDown,
        handlePointerMove,
        handlePointerUp
    };
}
