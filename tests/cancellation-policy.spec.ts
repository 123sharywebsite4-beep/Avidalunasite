import { expect, NO_PAYMENTS, test } from "./helpers";

// The Cancellation and Refund Policy: its own page, linked (not copied) right before every booking confirm.

const POLICY = "Cancellation and Refund Policy";

test("the policy page shows the full policy", async ({ page }) => {
  await page.goto("/cancellation-policy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(POLICY);
  await expect(page.locator("article")).toContainText("a $25 cancellation fee applies");
  await expect(page.locator("article")).toContainText("50% of the booked IV service price");
  await expect(page.locator("article")).toContainText("telehealth consultation is nonrefundable");
  await expect(page.locator("article")).toContainText("any advance payment for that treatment will be refunded");
  await expect(page.locator(".legal-review-note")).toHaveCount(0);
});

for (const [name, url] of [
  ["restorative, pay online", "/book/restorative"],
  ["restorative, pay at visit", `${NO_PAYMENTS}/book/restorative`],
  ["IV intake", "/book"],
] as const) {
  test(`${name}: the policy is linked before the confirm button`, async ({ page }) => {
    await page.goto(url);
    const note = page.getByTestId("policy-note");
    await expect(note).toBeVisible();
    await expect(note.getByRole("link", { name: POLICY })).toHaveAttribute("href", "/cancellation-policy");
    await expect(note).not.toContainText("$25");
  });
}

test("footer and terms link to the policy", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.locator("footer").getByRole("link", { name: "Cancellation policy" })).toHaveAttribute("href", "/cancellation-policy");
  await expect(page.locator("article").getByRole("link", { name: POLICY })).toHaveAttribute("href", "/cancellation-policy");
});
