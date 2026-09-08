import { createRef } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  VirtualInput,
  type VirtualInputHandle,
  type VirtualInputProps,
} from "./Input.js";
import { VirtualInputProvider } from "./Provider.js";

function clipboard(readText: () => Promise<string>) {
  const read = vi.fn(readText);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { readText: read },
  });
  return read;
}
function deferred() {
  let resolve!: (value: string) => void;
  const promise = new Promise<string>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function setup(props: VirtualInputProps = {}) {
  const ref = createRef<VirtualInputHandle>();
  const view = (next: VirtualInputProps) => (
    <VirtualInputProvider keyboardVisibility="always" defaultHangulMode={false}>
      <VirtualInput ref={ref} {...next} />
    </VirtualInputProvider>
  );
  const result = render(view(props));
  act(() => ref.current!.focus());
  return {
    ref,
    input: screen.getByRole("textbox") as HTMLInputElement,
    update: (next: VirtualInputProps) => result.rerender(view(next)),
  };
}
const status = () => screen.getByRole("status").textContent;

describe("paste at the native selection", () => {
  it("copies from one input and pastes at a chosen position in another", async () => {
    let text = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => text,
        writeText: async (value: string) => {
          text = value;
        },
      },
    });
    const source = createRef<VirtualInputHandle>(),
      target = createRef<VirtualInputHandle>();
    render(
      <VirtualInputProvider keyboardVisibility="always">
        <VirtualInput
          ref={source}
          defaultValue="앞 복사 뒤"
          aria-label="원본"
        />
        <VirtualInput ref={target} defaultValue="AB" aria-label="대상" />
      </VirtualInputProvider>,
    );
    act(() => {
      source.current!.focus();
      source.current!.setSelectionRange(2, 4);
    });
    await act(async () => source.current!.copySelection());
    act(() => {
      target.current!.focus();
      target.current!.setSelectionRange(1, 1);
    });
    await act(async () => {
      fireEvent.click(
        document
          .querySelector("virtual-keypad")!
          .shadowRoot!.querySelector('[aria-label="붙여넣기"]')!,
      );
    });
    expect((screen.getByLabelText("원본") as HTMLInputElement).value).toBe(
      "앞 복사 뒤",
    );
    expect((screen.getByLabelText("대상") as HTMLInputElement).value).toBe(
      "A복사B",
    );
    expect(document.activeElement).toBe(screen.getByLabelText("대상"));
  });
  it("an obsolete response cannot finish a newer paste request", async () => {
    const old = deferred(),
      latest = deferred();
    const read = clipboard(() => old.promise);
    const { ref, input } = setup({ defaultValue: "AB" });
    let first!: Promise<void>, second!: Promise<void>;
    act(() => {
      first = ref.current!.pasteClipboard();
    });
    act(() => ref.current!.setSelectionRange(1, 1));
    read.mockImplementation(() => latest.promise);
    act(() => {
      second = ref.current!.pasteClipboard();
    });
    await act(async () => {
      old.resolve("old");
      await first;
    });
    expect(input.value).toBe("AB");
    await act(async () => {
      latest.resolve("new");
      await second;
    });
    expect(input.value).toBe("AnewB");
  });
  it("reads only on explicit paste and keeps the inserted caret ready for typing", async () => {
    const read = clipboard(async () => "친구");
    const { ref, input } = setup({ defaultValue: "안녕!" });
    expect(read).not.toHaveBeenCalled();
    act(() => ref.current!.setSelectionRange(2, 2));
    await act(async () => ref.current!.pasteClipboard());
    expect(input.value).toBe("안녕친구!");
    expect(input.selectionStart).toBe(4);
    expect(document.activeElement).toBe(input);
    expect(status()).toBe("붙여넣었어요");
    fireEvent.keyDown(input, { key: "x" });
    expect(input.value).toBe("안녕친구x!");
  });
  it("uses the current OS caret even before selectionchange is delivered", async () => {
    clipboard(async () => "X");
    const { ref, input } = setup({ defaultValue: "hello" });
    input.setSelectionRange(2, 2);
    await act(async () => ref.current!.pasteClipboard());
    expect(input.value).toBe("heXllo");
  });
  it("ignores a pending paste after the OS moves its caret without an event", async () => {
    const pending = deferred();
    clipboard(() => pending.promise);
    const { ref, input } = setup({ defaultValue: "hello" });
    let operation!: Promise<void>;
    act(() => {
      operation = ref.current!.pasteClipboard();
    });
    input.setSelectionRange(1, 1);
    await act(async () => {
      pending.resolve("X");
      await operation;
    });
    expect(input.value).toBe("hello");
    expect(input.selectionStart).toBe(1);
  });
  it("prevents duplicate reads and does not duplicate a native paste while permission is pending", async () => {
    const pending = deferred();
    const read = clipboard(() => pending.promise);
    const { ref, input } = setup();
    let operation!: Promise<void>;
    act(() => {
      operation = ref.current!.pasteClipboard();
      void ref.current!.pasteClipboard();
    });
    expect(read).toHaveBeenCalledTimes(1);
    fireEvent.paste(input, { clipboardData: { getData: () => "한 번" } });
    await act(async () => {
      pending.resolve("한 번");
      await operation;
    });
    expect(input.value).toBe("한 번");
  });
  it("does not insert a delayed clipboard result after closing and reopening", async () => {
    const pending = deferred();
    clipboard(() => pending.promise);
    const { ref, input } = setup();
    let operation!: Promise<void>;
    act(() => {
      operation = ref.current!.pasteClipboard();
    });
    act(() => ref.current!.blur());
    act(() => ref.current!.focus());
    await act(async () => {
      pending.resolve("old");
      await operation;
    });
    expect(input.value).toBe("");
  });
  it.each([
    { disabled: true },
    { readOnly: true },
    { mode: "number" as const },
    { maxLength: 1 },
    { value: "reset" },
  ])(
    "invalidates a pending request when input settings change: %o",
    async (change) => {
      const pending = deferred();
      clipboard(() => pending.promise);
      const { ref, input, update } = setup();
      let operation!: Promise<void>;
      act(() => {
        operation = ref.current!.pasteClipboard();
      });
      update(change);
      await act(async () => {
        pending.resolve("123");
        await operation;
      });
      expect(input.value).toBe("value" in change ? "reset" : "");
    },
  );
  it.each([
    ["", {}, "붙여넣을 텍스트가 없어요"],
    ["abc", { mode: "number" }, "이 입력란에 붙여넣을 수 없는 내용이에요"],
    ["long", { maxLength: 3 }, "입력 길이 제한을 초과했어요"],
    [
      "x",
      { filterKey: () => false },
      "이 입력란에 붙여넣을 수 없는 내용이에요",
    ],
  ] as [string, VirtualInputProps, string][])(
    "explains a rejected paste without erasing selection: %s",
    async (text, props, message) => {
      clipboard(async () => text);
      const { ref, input } = setup({ defaultValue: "123", ...props });
      act(() => ref.current!.setSelectionRange(1, 2));
      await act(async () => ref.current!.pasteClipboard());
      expect(input.value).toBe("123");
      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(2);
      expect(status()).toBe(message);
    },
  );
  it("does not report success when a controlled parent rejects the paste", async () => {
    clipboard(async () => "x");
    const { ref, input } = setup({ value: "hello", onValueChange: vi.fn() });
    await act(async () => ref.current!.pasteClipboard());
    expect(input.value).toBe("hello");
    expect(status()).toBe("입력값이 적용되지 않았어요");
  });
  it("keeps the target selection and native paste available after denied clipboard access", async () => {
    const error = vi.fn();
    clipboard(async () => {
      throw new Error("Denied");
    });
    const { ref, input } = setup({
      defaultValue: "hello",
      onClipboardError: error,
    });
    act(() => ref.current!.setSelectionRange(1, 4));
    await act(async () => ref.current!.pasteClipboard());
    expect(error).toHaveBeenCalledTimes(1);
    expect(status()).toContain("길게 눌러 ‘붙여넣기’");
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(4);
    fireEvent.paste(input, { clipboardData: { getData: () => "i" } });
    expect(input.value).toBe("hio");
    expect(status()).toBe("붙여넣었어요");
  });
});
