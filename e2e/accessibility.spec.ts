import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const theme of ["light", "dark"]) {
  test(`no automated WCAG AA violations with ${theme} keyboard`, async ({
    page,
  }) => {
    await page.goto("/");
    if (theme === "dark")
      await page.getByRole("button", { name: "☾ 다크" }).click();
    await page.getByRole("textbox").click();
    await expect(
      page.getByRole("group", { name: "가상 키보드" }),
    ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}
