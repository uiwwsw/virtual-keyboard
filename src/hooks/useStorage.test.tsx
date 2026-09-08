import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useStorage } from "./useStorage.js";
describe("stored preferences", () => {
  it("synchronizes providers and applies sequential functional updates", () => {
    const first = renderHook(() => useStorage("test-language", true));
    const second = renderHook(() => useStorage("test-language", true));
    act(() => first.result.current[1](false));
    expect(second.result.current[0]).toBe(false);
    act(() => {
      first.result.current[1]((previous) => !previous);
      first.result.current[1]((previous) => !previous);
    });
    expect(first.result.current[0]).toBe(false);
  });
  it("keeps working when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Denied");
    });
    const { result } = renderHook(() => useStorage("test-language", true));
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });
  it("recovers from invalid JSON and ignores session storage events", () => {
    localStorage.setItem("test-language", "broken");
    const { result } = renderHook(() => useStorage("test-language", true));
    expect(result.current[0]).toBe(true);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "test-language",
          newValue: "false",
          storageArea: sessionStorage,
        }),
      ),
    );
    expect(result.current[0]).toBe(true);
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "test-language",
          newValue: "false",
          storageArea: localStorage,
        }),
      ),
    );
    expect(result.current[0]).toBe(false);
  });
});
