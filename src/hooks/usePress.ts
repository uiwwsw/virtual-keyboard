import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

/** Commit on release so a cancelled touch never executes a key or toolbar action. */
export function usePress(
  action: () => void,
  { disabled = false, repeat = false } = {},
) {
  const latest = useRef(action);
  latest.current = action;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointer = useRef<{
    id: number;
    bounds: DOMRect;
    repeated: boolean;
  } | null>(null);
  const [pressed, setPressed] = useState(false);
  const cancel = useCallback(() => {
    clearTimeout(timer.current);
    pointer.current = null;
    setPressed(false);
  }, []);
  useEffect(() => {
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      cancel();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
    };
  }, [cancel]);
  useEffect(() => {
    if (disabled) cancel();
  }, [disabled, cancel]);
  const inside = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = pointer.current?.bounds;
    return (
      !!bounds &&
      event.clientX >= bounds.left &&
      event.clientX <= bounds.right &&
      event.clientY >= bounds.top &&
      event.clientY <= bounds.bottom
    );
  };
  return {
    "data-pressed": pressed || undefined,
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (disabled || event.button !== 0 || pointer.current) return;
      event.preventDefault();
      pointer.current = {
        id: event.pointerId,
        bounds: event.currentTarget.getBoundingClientRect(),
        repeated: false,
      };
      setPressed(true);
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* The browser may have already cancelled the pointer. */
      }
      if (repeat) {
        const tick = () => {
          if (!pointer.current) return;
          pointer.current.repeated = true;
          latest.current();
          timer.current = setTimeout(tick, 65);
        };
        timer.current = setTimeout(tick, 450);
      }
    },
    onPointerMove: (event: PointerEvent<HTMLButtonElement>) => {
      if (pointer.current?.id === event.pointerId && !inside(event)) cancel();
    },
    onPointerUp: (event: PointerEvent<HTMLButtonElement>) => {
      if (pointer.current?.id !== event.pointerId) return;
      const activate = !disabled && inside(event) && !pointer.current.repeated;
      cancel();
      if (activate) latest.current();
    },
    onPointerCancel: (event: PointerEvent<HTMLButtonElement>) => {
      if (pointer.current?.id === event.pointerId) cancel();
    },
    onLostPointerCapture: (event: PointerEvent<HTMLButtonElement>) => {
      if (pointer.current?.id === event.pointerId) cancel();
    },
    onPointerLeave: (event: PointerEvent<HTMLButtonElement>) => {
      if (pointer.current?.id === event.pointerId && !inside(event)) cancel();
    },
    onClick: (event: { detail: number }) => {
      // Keyboard and assistive-technology activation has no pointer sequence.
      if (!disabled && event.detail === 0 && !pointer.current) latest.current();
    },
  };
}
