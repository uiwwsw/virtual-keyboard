import { expect, test, type Locator } from "@playwright/test";

async function select(input: Locator, anchor: number, caret: number) {
  await input.evaluate(
    (field, { anchor, caret }) => {
      const text = field.querySelector("[data-input-text]")!;
      const point = (index: number): [Node, number] => {
        const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node) {
          const length = node.textContent!.length;
          if (index <= length) return [node, index];
          index -= length;
          node = walker.nextNode();
        }
        return [text, text.childNodes.length];
      };
      window
        .getSelection()!
        .setBaseAndExtent(...point(anchor), ...point(caret));
    },
    { anchor, caret },
  );
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
  await input.locator('[data-char-index="7"]').dblclick();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("world");
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
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("world");
  await page.getByRole("button", { name: "x", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "hello x");
  await expect(page.locator("virtual-keypad")).toBeVisible();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
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
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("world");
  await page.getByRole("button", { name: "전체 선택", exact: true }).click();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe(
    "hello world",
  );
});

test("native copy events use the current DOM range even before selectionchange is delivered", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  const result = await input.evaluate((field) => {
    const first = field.querySelector('[data-char-index="0"]')!.firstChild!;
    const last = field.querySelector('[data-char-index="4"]')!.firstChild!;
    getSelection()!.setBaseAndExtent(first, 0, last, 1);
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
  await input.locator('[data-char-index="4"]').dblclick();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("복사");
});

test("mouse dragging selects real text and the delete icon removes exactly that selection", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop pointer selection");
  const input = page.getByRole("textbox");
  const first = await input.locator('[data-char-index="0"]').boundingBox();
  const last = await input.locator('[data-char-index="5"]').boundingBox();
  await page.mouse.move(first!.x, first!.y + first!.height / 2);
  await page.mouse.down();
  await page.mouse.move(last!.x, last!.y + last!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => getSelection()?.toString()))
    .toBe("hello");
  const backspace = page.getByRole("button", { name: "지우기", exact: true });
  await expect(
    backspace.locator('svg[data-key-icon="backspace"]'),
  ).toBeVisible();
  await backspace.click();
  await expect(input).toHaveAttribute("data-value", " world");
});
