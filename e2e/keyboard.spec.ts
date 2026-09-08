import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /입력의 감각까지/ }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("Korean input, jamo deletion, selection replacement and close", async ({
  page,
}) => {
  await page.getByRole("button", { name: "한 한국어" }).click();
  const input = page.getByRole("textbox");
  await input.click();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  for (const name of ["ㅎ", "ㅏ", "ㄴ", "ㄱ", "ㅡ", "ㄹ"])
    await keyboard.getByRole("button", { name, exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "한글");
  await keyboard.getByRole("button", { name: "지우기", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "한그");
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.press("Backspace");
  await expect(input).toHaveAttribute("data-value", "");
  await page.keyboard.type("gksrmf");
  await expect(input).toHaveAttribute("data-value", "한글");
  await page.keyboard.press("Escape");
  await expect(keyboard).toHaveCount(0);
});
test("number policy, per-mode values, macros and theme", async ({ page }) => {
  await page.getByRole("button", { name: "123 숫자" }).click();
  const input = page.getByRole("textbox");
  await input.click();
  await page.keyboard.type("a1b2c3");
  await expect(input).toHaveAttribute("data-value", "123");
  await page.getByRole("button", { name: "⌘ 커스텀" }).click();
  await input.click();
  await page.getByRole("button", { name: "인사", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "안녕하세요! ");
  await page.getByRole("button", { name: "☾ 다크" }).click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "123 숫자" }).click();
  await expect(input).toHaveAttribute("data-value", "123");
  await page.getByRole("button", { name: "초기화" }).click();
  await expect(input).toHaveAttribute("data-value", "");
});
test("desktop keyboard can be disabled and the input stays usable", async ({
  page,
}) => {
  await page.getByLabel("화면에 가상 키보드 표시").uncheck();
  await page.getByRole("button", { name: /abc 영문/ }).click();
  const input = page.getByRole("textbox");
  await input.click();
  await expect(page.getByRole("group", { name: "가상 키보드" })).toHaveCount(0);
  await page.keyboard.type("hello123");
  await expect(input).toHaveAttribute("data-value", "hello");
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.type("H");
  await expect(input).toHaveAttribute("data-value", "Hello");
});
test("small viewport fits the page and keeps the input above the keypad", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const input = page.getByRole("textbox");
  await input.click();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  await expect(keyboard).toBeVisible();
  await expect
    .poll(async () => {
      const field = await input.boundingBox();
      const keys = await keyboard.boundingBox();
      return field!.y + field!.height <= keys!.y;
    })
    .toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("mobile-keyboard.png"),
    fullPage: true,
  });
});

test("keyboard buttons support focus and activation without a pointer", async ({
  page,
}) => {
  await page.getByRole("button", { name: "123 숫자" }).click();
  const input = page.getByRole("textbox");
  await input.click();
  const key = page
    .getByRole("group", { name: "가상 키보드" })
    .getByRole("button", { name: "1", exact: true });
  await key.focus();
  await page.keyboard.press("Enter");
  await expect(input).toHaveAttribute("data-value", "1");
  await page.keyboard.press("Space");
  await expect(input).toHaveAttribute("data-value", "11");
});

test("touch taps insert once and allow reopening after close", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch device regression");
  await page.getByRole("button", { name: "123 숫자" }).tap();
  const input = page.getByRole("textbox");
  await input.tap();
  await page.getByRole("button", { name: "1", exact: true }).tap();
  await expect(input).toHaveAttribute("data-value", "1");
  await page.getByRole("button", { name: "키보드 닫기" }).tap();
  await expect(page.getByRole("group", { name: "가상 키보드" })).toHaveCount(0);
  await input.tap();
  await expect(page.getByRole("group", { name: "가상 키보드" })).toBeVisible();
});

test("symbol layout and history work with the production bundle", async ({
  page,
}) => {
  const input = page.getByRole("textbox");
  await input.click();
  const keyboard = page.getByRole("group", { name: "가상 키보드" });
  await keyboard.getByRole("button", { name: "숫자·기호 전환" }).click();
  for (const name of ["1", "@", "."])
    await keyboard.getByRole("button", { name, exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "1@.");
  await page.keyboard.press("ControlOrMeta+z");
  await expect(input).toHaveAttribute("data-value", "1@");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await expect(input).toHaveAttribute("data-value", "1@.");
  await keyboard.getByRole("button", { name: "숫자·기호 전환" }).click();
  await keyboard.getByRole("button", { name: "텍스트 편집" }).click();
  await keyboard.getByRole("button", { name: "전체 선택" }).click();
  await keyboard.getByRole("button", { name: "지우기", exact: true }).click();
  await expect(input).toHaveAttribute("data-value", "");
  await keyboard.getByRole("button", { name: "실행 취소" }).click();
  await expect(input).toHaveAttribute("data-value", "1@.");
});
