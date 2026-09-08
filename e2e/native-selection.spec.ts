import { expect, test, type Locator } from "@playwright/test";

async function select(input: Locator, anchor: number, caret: number) {
  await input.evaluate(
    (element, { anchor, caret }) => {
      const field = element as HTMLInputElement;
      field.setSelectionRange(
        Math.min(anchor, caret),
        Math.max(anchor, caret),
        anchor > caret ? "backward" : "forward",
      );
    },
    { anchor, caret },
  );
}

const selectedText = (input: Locator) =>
  input.evaluate((element) => {
    const field = element as HTMLInputElement;
    return field.value.slice(field.selectionStart!, field.selectionEnd!);
  });

async function textPoint(input: Locator, index: number, fraction = 0) {
  return input.evaluate(
    (element, { index, fraction }) => {
      const field = element as HTMLInputElement;
      const style = getComputedStyle(field);
      const canvas = document.createElement("canvas").getContext("2d")!;
      canvas.font = style.font;
      const box = field.getBoundingClientRect();
      return {
        x:
          box.x +
          parseFloat(style.paddingLeft) +
          canvas.measureText(field.value.slice(0, index)).width +
          canvas.measureText(field.value[index] ?? "").width * fraction -
          field.scrollLeft,
        y: box.y + box.height / 2,
      };
    },
    { index, fraction },
  );
}

async function doubleClickWord(input: Locator, index: number) {
  const point = await textPoint(input, index, 0.4);
  const box = (await input.boundingBox())!;
  await input.dblclick({
    position: { x: point.x - box.x, y: point.y - box.y },
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) =>
          sessionStorage.setItem("copied-text", text),
      },
    });
  });
  await page.goto("/");
  await page.getByRole("textbox").click();
  await page.getByRole("button", { name: "한영 전환" }).click();
  await page.keyboard.type("hello world");
  await expect(page.getByRole("textbox")).toHaveAttribute(
    "data-value",
    "hello world",
  );
});

test("native word selection exposes copy immediately and typing replaces that range", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await doubleClickWord(input, 7);
  await expect.poll(() => selectedText(input)).toBe("world");
  const copy = page.getByRole("button", { name: "복사", exact: true });
  await expect(copy).toBeVisible();
  await expect(
    page.getByRole("button", { name: "w", exact: true }),
  ).toBeVisible();
  const prevented = await input.evaluate((field) => {
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
    });
    field.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await copy.click();
  expect(await page.evaluate(() => sessionStorage.getItem("copied-text"))).toBe(
    "world",
  );
  await expect(
    page.locator("virtual-keypad").getByText("복사했어요", { exact: true }),
  ).toBeVisible();
  await expect(input).toHaveAttribute("data-value", "hello world");
  expect(await selectedText(input)).toBe("world");
  await page.getByRole("button", { name: "x", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "hello x");
  await expect(page.locator("virtual-keypad")).toBeVisible();
  expect(await selectedText(input)).toBe("");
});

test("reverse native selection supports cut and undo without losing the selected range", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await select(input, 11, 6);
  await page.getByRole("button", { name: "잘라내기", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "hello ");
  expect(await page.evaluate(() => sessionStorage.getItem("copied-text"))).toBe(
    "world",
  );
  await page.keyboard.press("ControlOrMeta+z");
  await expect(input).toHaveAttribute("data-value", "hello world");
  await expect.poll(() => selectedText(input)).toBe("world");
  await page.getByRole("button", { name: "전체 선택", exact: true }).click();
  expect(await selectedText(input)).toBe("hello world");
});

test("native copy events use the current DOM range even before selectionchange is delivered", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  const result = await input.evaluate((field) => {
    (field as HTMLInputElement).setSelectionRange(0, 5);
    const data = new DataTransfer();
    const event = new ClipboardEvent("copy", {
      bubbles: true,
      cancelable: true,
      clipboardData: data,
    });
    field.dispatchEvent(event);
    return {
      copied: data.getData("text/plain"),
      prevented: event.defaultPrevented,
    };
  });
  expect(result).toEqual({ copied: "hello", prevented: true });
  await expect(input).toHaveAttribute("data-value", "hello world");
});

test("a selection elsewhere is preserved and is not intercepted by the input", async ({
  page,
}) => {
  const result = await page.getByRole("textbox").evaluate((field) => {
    const heading = document.querySelector("h1")!;
    const range = document.createRange();
    range.selectNodeContents(heading);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    const before = getSelection()!.toString();
    const event = new ClipboardEvent("copy", {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer(),
    });
    field.dispatchEvent(event);
    return {
      before,
      after: getSelection()!.toString(),
      prevented: event.defaultPrevented,
    };
  });
  expect(result.before.length).toBeGreaterThan(0);
  expect(result.after).toBe(result.before);
  expect(result.prevented).toBe(false);
});

test("copy falls back to the native copy event when Clipboard API is unavailable", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    document.addEventListener("copy", (event) => {
      sessionStorage.setItem(
        "native-copy",
        event.clipboardData?.getData("text/plain") ?? "",
      );
    });
  });
  await select(input, 6, 11);
  await page.getByRole("button", { name: "복사", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("native-copy")))
    .toBe("world");
  await expect(input).toHaveAttribute("data-value", "hello world");
});

test("double-clicking the final Korean letter selects its word, not the following space", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await page.keyboard.press("ControlOrMeta+a");
  await input.evaluate((field) => {
    const data = new DataTransfer();
    data.setData("text/plain", "한글 복사 확인");
    field.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(input).toHaveAttribute("data-value", "한글 복사 확인");
  await doubleClickWord(input, 4);
  await expect.poll(() => selectedText(input)).toBe("복사");
});

test("mouse dragging selects real text and the delete icon removes exactly that selection", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop pointer selection");
  const input = page.getByRole("textbox");
  const first = await textPoint(input, 0);
  const last = await textPoint(input, 5);
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  await page.mouse.move(last.x, last.y, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => selectedText(input)).toBe("hello");
  const backspace = page.getByRole("button", { name: "지우기", exact: true });
  await expect(
    backspace.locator('svg[data-key-icon="backspace"]'),
  ).toBeVisible();
  await backspace.click();
  await expect(input).toHaveAttribute("data-value", " world");
});

test("browser text insertion preserves the native caret and follows the active policy", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await select(input, 6, 11);
  await page.keyboard.insertText("친구");
  await expect(input).toHaveValue("hello 친구");
  await expect(input).toHaveJSProperty("selectionStart", 8);
  await page.keyboard.press("ControlOrMeta+z");
  await expect(input).toHaveValue("hello world");
  expect(await selectedText(input)).toBe("world");
  await page.getByRole("button", { name: "123 숫자" }).click();
  await input.click();
  await page.keyboard.insertText("1a2b3");
  await expect(input).toHaveValue("123");
  await expect(input).toHaveJSProperty("selectionStart", 3);
});

test("native IME composition commits once and undo restores its selected range", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Uses Chromium's real composition protocol",
  );
  const input = page.getByRole("textbox");
  await select(input, 0, 11);
  const session = await context.newCDPSession(page);
  try {
    await session.send("Input.imeSetComposition", {
      text: "ㅎ",
      selectionStart: 1,
      selectionEnd: 1,
    });
    await expect(input).toHaveValue("ㅎ");
    await expect(input).toHaveAttribute("data-value", "hello world");
    await session.send("Input.imeSetComposition", {
      text: "한",
      selectionStart: 1,
      selectionEnd: 1,
    });
    await session.send("Input.insertText", { text: "한" });
    await expect(input).toHaveValue("한");
    await expect(input).toHaveAttribute("data-value", "한");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(input).toHaveValue("hello world");
    expect(await selectedText(input)).toBe("hello world");
  } finally {
    await session.detach();
  }
});
