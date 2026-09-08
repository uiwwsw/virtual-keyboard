import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

const LOCAL_EVENT = "virtual-keyboard:storage";

/** Storage is optional: blocked storage must never prevent an in-memory update. */
export function useStorage<T>(
  key: string,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>] {
  const initial = useRef(initialValue);
  const [value, setValue] = useState(initialValue);
  const current = useRef(value);
  const getDefault = useCallback(
    () =>
      initial.current instanceof Function ? initial.current() : initial.current,
    [],
  );
  useEffect(() => {
    const read = (raw: string | null): T => {
      try {
        const parsed: unknown = raw === null ? getDefault() : JSON.parse(raw);
        return typeof parsed === typeof getDefault()
          ? (parsed as T)
          : getDefault();
      } catch {
        return getDefault();
      }
    };
    const apply = (raw: string | null) => {
      current.current = read(raw);
      setValue(current.current);
    };
    try {
      apply(window.localStorage.getItem(key));
    } catch {
      /* Private/blocked storage. */
    }
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea && event.storageArea !== window.localStorage)
          return;
      } catch {
        return;
      }
      if (event.key === key || event.key === null) apply(event.newValue);
    };
    const onLocal = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; raw: string }>)
        .detail;
      if (detail.key === key) apply(detail.raw);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }, [key, getDefault]);
  const update = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      current.current = next instanceof Function ? next(current.current) : next;
      setValue(current.current);
      window.dispatchEvent(
        new CustomEvent(LOCAL_EVENT, {
          detail: { key, raw: JSON.stringify(current.current) },
        }),
      );
      try {
        window.localStorage.setItem(key, JSON.stringify(current.current));
      } catch {
        /* Keep in-memory state. */
      }
    },
    [key],
  );
  return [value, update];
}
