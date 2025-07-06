import { useState, useCallback, useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";

// SSR 환경을 위한 브라우저 여부 확인
const isBrowser = typeof window !== "undefined";

/**
 * 로컬 스토리지와 React 상태를 안전하고 효율적으로 동기화하는 커스텀 훅입니다.
 * SSR을 지원하며, 탭 간의 실시간 동기화 기능을 포함합니다.
 *
 * @template T - 동기화할 데이터의 타입
 * @param {string} key - 로컬 스토리지 키
 * @param {T | (() => T)} initialValue - 스토리지에 값이 없을 때 사용할 초기값 (값 또는 함수 형태)
 * @returns {[T, Dispatch<SetStateAction<T>>]} React의 useState와 동일한 형태의 튜플
 */
export function useStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, Dispatch<SetStateAction<T>>] {
  // 1. 상태 초기화: 브라우저 환경에서만 localStorage에서 값을 읽어옵니다.
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!isBrowser) {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      } else {
        const valueToStore =
          initialValue instanceof Function ? initialValue() : initialValue;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  // 2. 값 설정 함수: useState의 setter와 동일한 인터페이스를 제공합니다.
  const setValue: Dispatch<SetStateAction<T>> = useCallback(
    (value) => {
      if (!isBrowser) {
        console.warn(
          `Tried to set localStorage key "${key}" in a non-browser environment.`
        );
        return;
      }

      try {
        // 함수형 업데이트 (value => newValue) 지원
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // 상태 업데이트 및 로컬 스토리지 저장
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue] // storedValue를 의존성에 추가해 함수형 업데이트 시 최신 상태를 참조
  );

  // 3. 탭 간 동기화를 위한 이벤트 리스너
  useEffect(() => {
    if (!isBrowser) return;

    const handleStorageChange = (event: StorageEvent) => {
      // 현재 탭에서 발생한 변경은 무시 (setValue가 이미 처리했으므로)
      if (event.storageArea !== window.localStorage || event.key !== key) {
        return;
      }

      try {
        if (event.newValue) {
          // 다른 탭의 값이 현재 값과 다를 때만 상태 업데이트 (무한 루프 방지)
          if (JSON.stringify(storedValue) !== event.newValue) {
            setStoredValue(JSON.parse(event.newValue));
          }
        }
      } catch (error) {
        console.error(`Error handling storage change for key "${key}":`, error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, storedValue]); // storedValue 의존성 추가

  return [storedValue, setValue];
}
