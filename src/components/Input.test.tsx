import { StrictMode, useState } from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VirtualInput, type VirtualInputProps } from "./Input.js";
import { VirtualInputProvider } from "./Provider.js";
const type = (input: HTMLElement, text: string) => {
  for (const key of text) fireEvent.keyDown(input, { key });
};
function setup(props: VirtualInputProps = {}) {
  render(
    <StrictMode>
      <VirtualInputProvider
        keyboardVisibility="always"
        defaultHangulMode={false}
      >
        <VirtualInput aria-label="입력" {...props} />
      </VirtualInputProvider>
    </StrictMode>,
  );
  const input = screen.getByRole("textbox");
  fireEvent.focus(input);
  return input;
}
const valueOf = (input: HTMLElement) => input.getAttribute("data-value");
const keyButton = (label: string) =>
  Array.from(
    document
      .querySelector("virtual-keypad")!
      .shadowRoot!.querySelectorAll("button"),
  ).find((button) => button.getAttribute("aria-label") === label)!;

describe("VirtualInput integration", () => {
  it("keeps rapid edits and synchronous selection in order", () => {
    const changed = vi.fn();
    const input = setup({ onValueChange: changed });
    act(() => {
      type(input, "abc");
      fireEvent.keyDown(input, { key: "a", ctrlKey: true });
      fireEvent.keyDown(input, { key: "Backspace" });
      type(input, "xy");
    });
    expect(valueOf(input)).toBe("xy");
    expect(changed).toHaveBeenLastCalledWith("xy");
  });
  it("honors controlled resets, clamps the caret, and never displays a rejected edit", () => {
    const changed = vi.fn();
    const { rerender } = render(
      <VirtualInputProvider>
        <VirtualInput value="hello" onValueChange={changed} mode="alpha" />
      </VirtualInputProvider>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    type(input, "z");
    expect(valueOf(input)).toBe("hello");
    rerender(
      <VirtualInputProvider>
        <VirtualInput value="" onValueChange={changed} mode="alpha" />
      </VirtualInputProvider>,
    );
    type(input, "a");
    expect(changed).toHaveBeenLastCalledWith("a");
    expect(valueOf(input)).toBe("");
  });
  it("supports controlled accepted edits", () => {
    function Controlled() {
      const [value, setValue] = useState("");
      return (
        <VirtualInputProvider>
          <VirtualInput value={value} onValueChange={setValue} mode="alpha" />
        </VirtualInputProvider>
      );
    }
    render(<Controlled />);
    const input = screen.getByRole("textbox");
    type(input, "test");
    expect(valueOf(input)).toBe("test");
  });
  it("preserves provider fallback layouts and inserts a custom macro once", () => {
    render(
      <VirtualInputProvider
        keyboardVisibility="always"
        layout={[[{ value: "010", label: "휴대폰" }]]}
      >
        <VirtualInput />
      </VirtualInputProvider>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    fireEvent.click(keyButton("휴대폰"));
    expect(valueOf(input)).toBe("010");
  });
  it("handles virtual Shift, Backspace, Space, and Enter by value", () => {
    const onKeyDown = vi.fn();
    const input = setup({ mode: "hangul", onKeyDown });
    fireEvent.click(keyButton("Shift"));
    fireEvent.click(keyButton("ㄲ"));
    expect(valueOf(input)).toBe("ㄲ");
    expect(keyButton("Shift").getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(keyButton("지우기"));
    expect(valueOf(input)).toBe("");
    fireEvent.click(keyButton("공백"));
    fireEvent.click(keyButton("입력 완료"));
    expect(valueOf(input)).toBe(" ");
    expect(onKeyDown).toHaveBeenLastCalledWith(
      expect.objectContaining({ key: "Enter" }),
    );
  });
  it("sanitizes paste before inserting and enforces maxLength without erasing text", () => {
    const input = setup({ mode: "tel", defaultValue: "12", maxLength: 5 });
    fireEvent.keyDown(input, { key: "Home" });
    fireEvent.paste(input, { clipboardData: { getData: () => "a3-4b" } });
    expect(valueOf(input)).toBe("3412");
    type(input, "567");
    expect(valueOf(input)).toBe("34512");
  });
  it("calls supplied handlers and respects preventDefault", () => {
    const onFocus = vi.fn();
    const input = setup({
      onFocus,
      onKeyDown: (event) => event.preventDefault(),
    });
    type(input, "x");
    expect(onFocus).toHaveBeenCalled();
    expect(valueOf(input)).toBe("");
  });
  it.each([{ disabled: true }, { readOnly: true }])(
    "blocks edits and keypad for %o",
    (props) => {
      const input = setup({ ...props, defaultValue: "abc" });
      type(input, "x");
      fireEvent.keyDown(input, { key: "Backspace" });
      fireEvent.paste(input, { clipboardData: { getData: () => "z" } });
      expect(valueOf(input)).toBe("abc");
      expect(document.querySelector("virtual-keypad")).toBeNull();
    },
  );
  it("preserves free-text language preference after focusing a forced mode", () => {
    render(
      <VirtualInputProvider keyboardVisibility="always" defaultHangulMode>
        <VirtualInput aria-label="자유" />
        <VirtualInput aria-label="영문" mode="alpha" />
      </VirtualInputProvider>,
    );
    fireEvent.focus(screen.getByLabelText("영문"));
    const free = screen.getByLabelText("자유");
    fireEvent.focus(free);
    type(free, "rk");
    expect(valueOf(free)).toBe("가");
  });
  it("updates the active policy when the mode changes", () => {
    const { rerender } = render(
      <VirtualInputProvider keyboardVisibility="always">
        <VirtualInput mode="hangul" />
      </VirtualInputProvider>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    rerender(
      <VirtualInputProvider keyboardVisibility="always">
        <VirtualInput mode="number" />
      </VirtualInputProvider>,
    );
    type(input, "a1");
    expect(valueOf(input)).toBe("1");
    expect(keyButton("1")).toBeTruthy();
  });
  it("only keeps the active provider open and restores existing body padding", () => {
    document.body.style.paddingBottom = "37px";
    render(
      <>
        <VirtualInputProvider keyboardVisibility="always">
          <VirtualInput aria-label="하나" />
        </VirtualInputProvider>
        <VirtualInputProvider keyboardVisibility="always">
          <VirtualInput aria-label="둘" />
        </VirtualInputProvider>
      </>,
    );
    fireEvent.focus(screen.getByLabelText("하나"));
    fireEvent.focus(screen.getByLabelText("둘"));
    expect(document.querySelectorAll("virtual-keypad")).toHaveLength(1);
    fireEvent.keyDown(screen.getByLabelText("둘"), { key: "Escape" });
    expect(document.querySelector("virtual-keypad")).toBeNull();
    expect(document.body.style.paddingBottom).toBe("37px");
    document.body.style.paddingBottom = "";
  });
  it("reports clipboard rejection without an unhandled promise", async () => {
    const error = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { readText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    setup({ onClipboardError: error });
    fireEvent.click(keyButton("텍스트 편집"));
    await act(async () => {
      fireEvent.click(keyButton("붙여넣기"));
    });
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Denied" }),
    );
    expect(screen.getByRole("status").textContent).toContain("클립보드");
  });
});

describe("public control and history", () => {
  it("exposes focus, selection, value and undo/redo through a ref", async () => {
    const { createRef } = await import("react");
    const ref = createRef<import("./Input.js").VirtualInputHandle>();
    render(
      <VirtualInputProvider>
        <VirtualInput ref={ref} mode="alpha" defaultValue="hello" />
      </VirtualInputProvider>,
    );
    const input = screen.getByRole("textbox");
    act(() => {
      ref.current!.focus();
      ref.current!.setSelectionRange(0, 1);
    });
    type(input, "H");
    expect(ref.current!.getValue()).toBe("Hello");
    act(() => ref.current!.undo());
    expect(valueOf(input)).toBe("hello");
    act(() => ref.current!.redo());
    expect(valueOf(input)).toBe("Hello");
  });
  it("clears undo history on an external controlled reset", () => {
    const changed = vi.fn();
    const { rerender } = render(
      <VirtualInputProvider>
        <VirtualInput value="hello" onValueChange={changed} mode="alpha" />
      </VirtualInputProvider>,
    );
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    type(input, "x");
    rerender(
      <VirtualInputProvider>
        <VirtualInput value="" onValueChange={changed} mode="alpha" />
      </VirtualInputProvider>,
    );
    changed.mockClear();
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(valueOf(input)).toBe("");
    expect(changed).not.toHaveBeenCalled();
  });
});
