import { expect, test, type Locator } from "@playwright/test";

const touch = async (
  target: Locator,
  type: string,
  x: number,
  y: number,
  id = 41,
) =>
  target.dispatchEvent(type, {
    pointerType: "touch",
    pointerId: id,
    // Use a different id from locator.click()'s real mouse pointer.
    isPrimary: id === 41,
    button: 0,
    clientX: x,
    clientY: y,
  });

test("scrolling or cancelling a touch on an unfocused input does not open the keyboard", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.scrollIntoViewIfNeeded();
  const box = await input.boundingBox();
  const x = box!.x + 30,
    y = box!.y + 20;
  await touch(input, "pointerdown", x, y);
  await expect(page.locator("virtual-keypad")).toHaveCount(0);
  await touch(input, "pointermove", x, y - 50);
  await touch(input, "pointerup", x, y - 50);
  await expect(page.locator("virtual-keypad")).toHaveCount(0);
  await touch(input, "pointerdown", x, y);
  await touch(input, "pointercancel", x, y);
  await expect(page.locator("virtual-keypad")).toHaveCount(0);
});

test("cancelled key and toolbar gestures do not type, change language or close", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("textbox").click();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  for (const label of [
    "ㅎ",
    "한영 전환",
    "숫자·기호 전환",
    "텍스트 편집",
    "키보드 닫기",
  ]) {
    const key = keyboard.getByRole("button", { name: label, exact: true });
    const box = await key.boundingBox();
    const x = box!.x + box!.width / 2,
      y = box!.y + box!.height / 2;
    await touch(key, "pointerdown", x, y);
    await expect(keyboard).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveAttribute("data-value", "");
    await touch(key, "pointercancel", x, y);
    await expect(
      keyboard.getByRole("button", { name: "ㅎ", exact: true }),
    ).toBeVisible();
    await expect(
      keyboard.getByRole("button", { name: "한영 전환" }),
    ).toHaveText("한");
  }
});

test("dragging outside and back is not an outside tap", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("textbox").click();
  const outside = page.locator("body");
  await touch(outside, "pointerdown", 10, 100);
  await touch(outside, "pointermove", 10, 160);
  await touch(outside, "pointermove", 10, 100);
  await touch(outside, "pointerup", 10, 100);
  await expect(page.locator("virtual-keypad")).toBeVisible();
});

test("repeat deletion stops when the captured pointer moves off the key", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.type("abcdefghijklmnopqrstuvwx");
  const initial = await input.getAttribute("data-value");
  const key = page.getByRole("button", { name: "지우기", exact: true });
  const box = await key.boundingBox();
  await page.clock.install();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.clock.runFor(550);
  await page.mouse.move(box!.x - 60, box!.y - 60);
  const stopped = await input.getAttribute("data-value");
  expect(stopped).not.toBe(initial);
  await page.clock.runFor(500);
  await page.mouse.up();
  await expect(input).toHaveAttribute("data-value", stopped!);
});

test("holding and releasing never reselects or overwrites the browser caret", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.click();
  await expect(input).toHaveJSProperty("tagName", "INPUT");
  await expect(input).toHaveAttribute("inputmode", "none");
  await page.getByRole("button", { name: "한영 전환" }).click();
  await page.keyboard.type("hello world");
  const box = (await input.boundingBox())!;
  const x = box.x + 40,
    y = box.y + box.height / 2;
  await page.clock.install();
  await input.evaluate((element) =>
    (element as HTMLInputElement).setSelectionRange(3, 3),
  );
  await touch(input, "pointerdown", x, y);
  await page.clock.runFor(600);
  await expect(input).toHaveJSProperty("selectionStart", 3);
  await expect(input).toHaveJSProperty("selectionEnd", 3);
  // The OS updates its selection while a finger is held. No application timer or
  // pointerup handler may replace that range, including a backward selection.
  await input.evaluate((element) =>
    (element as HTMLInputElement).setSelectionRange(6, 11, "backward"),
  );
  await page.clock.runFor(600);
  await touch(input, "pointerup", x, y);
  await expect(input).toHaveJSProperty("selectionStart", 6);
  await expect(input).toHaveJSProperty("selectionEnd", 11);
  await expect(input).toHaveJSProperty("selectionDirection", "backward");
  await page.getByRole("button", { name: "x", exact: true }).click();
  await expect(input).toHaveValue("hello x");
  await touch(input, "pointerdown", x, y);
  await touch(input, "pointercancel", x, y);
  await page.clock.runFor(600);
  await expect(input).toHaveJSProperty("selectionStart", 7);
  await expect(input).toHaveJSProperty("selectionEnd", 7);
});

test("the full field including padding is a native touch target", async ({
  page,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  const wrapper = input.locator("..");
  const outer = (await wrapper.boundingBox())!;
  const inner = (await input.boundingBox())!;
  expect(inner.height).toBeGreaterThanOrEqual(outer.height - 2);
  await input.click({ position: { x: 5, y: 5 } });
  await expect(input).toBeFocused();
  await expect(page.locator("virtual-keypad")).toBeVisible();
});

test("native touch scrolling over the input does not hijack the page", async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== "chromium" || !isMobile,
    "Uses native Chromium touch protocol",
  );
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.scrollIntoViewIfNeeded();
  const box = await input.boundingBox();
  const before = await page.evaluate(() => window.scrollY);
  const x = box!.x + box!.width / 2,
    y = box!.y + box!.height / 2;
  const session = await context.newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 1 }],
    });
    for (let offset = 20; offset <= 140; offset += 20)
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x, y: y - offset, id: 1 }],
      });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(before + 20);
    await expect(page.locator("virtual-keypad")).toHaveCount(0);
  } finally {
    await session.detach();
  }
});

test("landscape keyboard keeps touch targets usable and input visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.click();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  await expect
    .poll(async () => {
      const field = await input.boundingBox(),
        keys = await keyboard.boundingBox();
      return field!.y + field!.height <= keys!.y;
    })
    .toBe(true);
  const buttons = keyboard.getByRole("button");
  for (const button of await buttons.all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.y + box!.height).toBeLessThanOrEqual(390);
  }
  await page.getByRole("button", { name: "키보드 닫기" }).click();
  await expect(keyboard).toHaveCount(0);
});
