import AxeBuilder from "@axe-core/playwright";
import { expect, PUBLIC_PAGES, test } from "./helpers";

test.describe("accessibility (axe, WCAG 2.2 AA)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`axe: ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
      expect(summary).toEqual([]);
    });
  }

  test("booking works with the keyboard only", async ({ page }) => {
    await page.goto("/book");
    await page.getByLabel("First name").focus();
    await page.keyboard.type("Ana");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Rivera");
    await page.keyboard.press("Tab");
    await page.keyboard.type("ana@example.com");
    await page.keyboard.press("Tab"); // opt-in
    await page.keyboard.press("Space");
    await page.keyboard.press("Tab"); // submit
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("hydreight-button")).toBeVisible();
    await expect(page.getByTestId("book-success")).toBeFocused();
  });

  test("add-ons work with the keyboard only", async ({ page }) => {
    await page.goto("/add-ons");
    await page.getByRole("button", { name: "Add one Aromatherapy" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Aromatherapy: 1")).toBeVisible();
  });
});
