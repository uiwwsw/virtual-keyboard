import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parseKeyInput } from "./parseKeyInput";

function createKeyboardEvent(key: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...options,
  } as KeyboardEvent;
}

describe("parseKeyInput", () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalNavigator) {
      vi.stubGlobal("navigator", originalNavigator);
    }
  });

  it("ignores escape and navigation control keys", () => {
    expect(parseKeyInput(createKeyboardEvent("Escape"), false)).toEqual({ handled: false });
    expect(parseKeyInput(createKeyboardEvent("Esc"), false)).toEqual({ handled: false });
    expect(parseKeyInput(createKeyboardEvent("ArrowLeft"), false)).toEqual({ handled: false });
    expect(parseKeyInput(createKeyboardEvent("PageDown"), false)).toEqual({ handled: false });
  });

  it("returns plain text keys on macOS", () => {
    expect(parseKeyInput(createKeyboardEvent("a"), false)).toEqual({
      handled: true,
      text: "a",
      composing: false,
    });
  });

  it("toggles hangul mode on windows HangulMode key", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });

    expect(parseKeyInput(createKeyboardEvent("HangulMode"), false)).toEqual({
      handled: true,
      toggleHangulMode: true,
    });
  });
});
