import { expect, test } from "@playwright/test";

test("rapid touch typing keeps focus across key gaps and keyboard padding", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Requires a touch device");
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.tap();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  await expect(keyboard).toBeVisible();
  await expect
    .poll(async () => {
      const field = await input.boundingBox();
      const keys = await keyboard.boundingBox();
      return field!.y + field!.height <= keys!.y;
    })
    .toBe(true);
  const names = ["ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅡ", "ㄹ", "공백"];
  const points = await Promise.all(
    names.map(async (name) => {
      const box = await keyboard
        .getByRole("button", { name, exact: true })
        .boundingBox();
      return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
    }),
  );
  const first = await keyboard
    .getByRole("button", { name: "ㅂ", exact: true })
    .boundingBox();
  const second = await keyboard
    .getByRole("button", { name: "ㅈ", exact: true })
    .boundingBox();
  const bounds = await keyboard.boundingBox();
  const caption = await keyboard
    .getByText("한국어 · 두벌식", { exact: true })
    .boundingBox();
  const gaps = [
    {
      x: (first!.x + first!.width + second!.x) / 2,
      y: first!.y + first!.height / 2,
    },
    { x: bounds!.x + 3, y: points[0].y },
    { x: caption!.x + caption!.width / 2, y: caption!.y + caption!.height / 2 },
  ];
  for (let round = 0; round < gaps.length; round++) {
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.press("Backspace");
    for (const point of points) await page.touchscreen.tap(point.x, point.y);
    await expect(input).toHaveAttribute("data-value", "한글 ");
    // Android may snap a narrow-gap touch to a nearby key. Check typing
    // before the gap, then independently verify that focus is retained.
    await page.touchscreen.tap(gaps[round].x, gaps[round].y);
    await expect(keyboard).toBeVisible();
    await expect(input).toBeFocused();
  }
  await keyboard.getByRole("button", { name: "지우기", exact: true }).tap();
  await expect(input).toHaveAttribute("data-value", "한글");
  await page.getByRole("heading", { name: "자유 입력", exact: true }).tap();
  await expect(keyboard).toHaveCount(0);
});

test("overlapping two-finger typing inserts each key once and stays open", async ({
  page,
  context,
  browserName,
  isMobile,
}) => {
  test.skip(
    browserName !== "chromium" || !isMobile,
    "Uses Chromium native multi-touch protocol",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "abc 영문", exact: true }).tap();
  const input = page.getByRole("textbox");
  await input.tap();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  const a = await keyboard
    .getByRole("button", { name: "a", exact: true })
    .boundingBox();
  const l = await keyboard
    .getByRole("button", { name: "l", exact: true })
    .boundingBox();
  const left = { x: a!.x + a!.width / 2, y: a!.y + a!.height / 2, id: 1 };
  const right = { x: l!.x + l!.width / 2, y: l!.y + l!.height / 2, id: 2 };
  const session = await context.newCDPSession(page);
  try {
    for (let i = 0; i < 10; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [left],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [left, right],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [left],
      });
      await session.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await expect(input).toHaveAttribute("data-value", "al".repeat(10));
    await expect(input).toBeFocused();
    await expect(keyboard).toBeVisible();
  } finally {
    await session.detach();
  }
});

test("language key shows the current language and switches without losing composition or focus", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  const input = page.getByRole("textbox");
  await input.click();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  const language = keyboard.getByRole("button", { name: "한영 전환" });
  await expect(language).toHaveText("한");
  await expect(language).toHaveAttribute("aria-pressed", "true");
  await keyboard.getByRole("button", { name: "ㅎ", exact: true }).click();
  await keyboard.getByRole("button", { name: "ㅏ", exact: true }).click();
  await language.click();
  await expect(language).toHaveText("EN");
  await expect(language).toHaveAttribute("aria-pressed", "false");
  await keyboard.getByRole("button", { name: "a", exact: true }).click();
  await language.click();
  await keyboard.getByRole("button", { name: "ㄴ", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "하aㄴ");
  await expect(input).toBeFocused();
  await page.getByRole("button", { name: "한 한국어" }).click();
  await input.click();
  await expect(language).toBeDisabled();
  await expect(language).toHaveText("한");
  const disabledKey = await language.boundingBox();
  const point = {
    x: disabledKey!.x + disabledKey!.width / 2,
    y: disabledKey!.y + disabledKey!.height / 2,
  };
  if (isMobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  await expect(keyboard).toBeVisible();
  await expect(input).toBeFocused();
});
