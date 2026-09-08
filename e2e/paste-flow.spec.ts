import { expect, test, type Locator } from "@playwright/test";

const pasteButton = (input: Locator) =>
  input.page().getByRole("button", { name: "붙여넣기", exact: true });
async function select(input: Locator, start: number, end = start) {
  await input.evaluate(
    (element, { start, end }) => {
      (element as HTMLInputElement).setSelectionRange(start, end, "backward");
    },
    { start, end },
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) =>
          sessionStorage.setItem("clipboard", text),
        readText: async () => {
          sessionStorage.setItem(
            "reads",
            String(Number(sessionStorage.getItem("reads")) + 1),
          );
          return sessionStorage.getItem("clipboard") ?? "새로운 문장";
        },
      },
    });
  });
  await page.goto("/");
});

test("first focus exposes paste without opening edit mode or reading the clipboard", async ({
  page,
  isMobile,
}) => {
  const input = page.getByRole("textbox");
  if (isMobile) await input.tap();
  else await input.click();
  expect(await page.evaluate(() => sessionStorage.getItem("reads"))).toBeNull();
  await expect(pasteButton(input)).toBeVisible();
  if (isMobile) await pasteButton(input).tap();
  else await pasteButton(input).click();
  await expect(input).toHaveValue("새로운 문장");
  await expect(input).toHaveJSProperty("selectionStart", 6);
  await expect(input).toBeFocused();
  await expect(
    page.locator("virtual-keypad").getByText("붙여넣었어요", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ㅎ", exact: true }),
  ).toBeVisible();
  await page.keyboard.type("!");
  await expect(input).toHaveValue("새로운 문장!");
});

test("copy then click another position and paste inserts there with one undo step", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.insertText("hello world");
  await select(input, 6, 11);
  await page.getByRole("button", { name: "복사", exact: true }).click();
  const x = await input.evaluate((element) => {
    const field = element as HTMLInputElement;
    const style = getComputedStyle(field);
    const canvas = document.createElement("canvas").getContext("2d")!;
    canvas.font = style.font;
    return parseFloat(style.paddingLeft) + canvas.measureText("he").width;
  });
  await input.click({
    position: { x, y: (await input.boundingBox())!.height / 2 },
  });
  await expect(input).toHaveJSProperty("selectionStart", 2);
  await expect(input).toHaveJSProperty("selectionEnd", 2);
  await pasteButton(input).click();
  await expect(input).toHaveValue("heworldllo world");
  await expect(input).toHaveJSProperty("selectionStart", 7);
  await expect(input).toBeFocused();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(input).toHaveValue("hello world");
  await expect(input).toHaveJSProperty("selectionStart", 2);
});

test("selected text can be replaced from the selection toolbar and paste returns keyboard focus", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.insertText("hello world");
  await page.evaluate(() => sessionStorage.setItem("clipboard", "친구"));
  await select(input, 6, 11);
  const paste = pasteButton(input);
  // Keyboard/assistive activation also returns to the text after insertion.
  await paste.focus();
  await page.keyboard.press("Enter");
  await expect(input).toHaveValue("hello 친구");
  await expect(input).toHaveJSProperty("selectionStart", 8);
  await expect(input).toBeFocused();
});

test("denied clipboard access preserves the chosen range for the native paste menu", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.insertText("hello world");
  await select(input, 6, 11);
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: async () => {
          throw new Error("Denied");
        },
      },
    }),
  );
  await pasteButton(input).click();
  await expect(
    page.locator("virtual-keypad").getByText(/길게 눌러 ‘붙여넣기’/),
  ).toBeVisible();
  await expect(input).toHaveJSProperty("selectionStart", 6);
  await expect(input).toHaveJSProperty("selectionEnd", 11);
  await input.evaluate((field) => {
    const data = new DataTransfer();
    data.setData("text/plain", "친구");
    field.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(input).toHaveValue("hello 친구");
  await expect(input).toBeFocused();
});

test("moving the caret cancels a pending read and late clipboard data does not insert elsewhere", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.insertText("hello");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: () =>
          new Promise<string>((resolve) => {
            Object.assign(window, { finishPaste: () => resolve("stale") });
          }),
      },
    }),
  );
  await pasteButton(input).click();
  await expect(pasteButton(input)).toBeDisabled();
  await expect(pasteButton(input)).toHaveAttribute("aria-busy", "true");
  await page.keyboard.press("Home");
  await expect(pasteButton(input)).toBeEnabled();
  await page.evaluate(() =>
    (window as unknown as { finishPaste: () => void }).finishPaste(),
  );
  await expect(input).toHaveValue("hello");
  await expect(input).toHaveJSProperty("selectionStart", 0);
});

test("paste stays visible and fits a 320px keyboard before and after selecting text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.insertText("선택한 텍스트");
  for (const [start, end] of [
    [0, 0],
    [0, 8],
  ]) {
    await select(input, start, end);
    await expect(pasteButton(input)).toBeVisible();
    const box = (await pasteButton(input).boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.x + box.width).toBeLessThanOrEqual(320);
    expect(
      await page
        .locator("virtual-keypad")
        .evaluate((host) => host.scrollWidth <= host.clientWidth),
    ).toBe(true);
  }
});
