import { expect, expectMailchimpCall, test } from "./helpers";

// The free-guide signup on the home page. The test server sets LEAD_MAGNET_TEST_ENABLED=1
// (playwright.config.ts) because the block is off by default. Mailchimp is mocked in
// tests/helpers.ts; the real endpoint is never reached.

test.describe("free-guide signup (SOURCE=lead-magnet)", () => {
  test("validates required fields, then signs up and shows the thank-you message", async ({ page, mocks }) => {
    await page.goto("/");
    const section = page.getByTestId("lead-magnet");
    await expect(section.getByRole("heading", { name: "Wellness Notes from a Nurse" })).toBeVisible();
    const form = section.getByRole("form", { name: "Free guide signup" });

    // Empty submit: all three fields are flagged and nothing is sent.
    await form.getByRole("button", { name: "Get your free copy" }).click();
    await expect(form.getByText("Please enter your name.")).toHaveCount(2);
    await expect(form.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(form.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(mocks.mailchimp).toHaveLength(0);

    await form.getByLabel("First name").fill("Ana");
    await form.getByLabel("Last name").fill("Rivera");
    await form.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await form.getByRole("button", { name: "Get your free copy" }).click();

    const success = section.getByTestId("lead-magnet-success");
    await expect(success).toHaveText(
      "Thank you for requesting your complimentary copy of Wellness Notes from a Nurse. It's on its way to your inbox.",
    );
    await expect(success).toBeFocused();
    expect(mocks.mailchimp).toHaveLength(1);
    expectMailchimpCall(mocks.mailchimp[0], {
      EMAIL: "ana@example.com",
      FNAME: "Ana",
      LNAME: "Rivera",
      SOURCE: "lead-magnet",
    });
  });

  test("shows an error and keeps the form when Mailchimp fails", async ({ page, mocks }) => {
    mocks.mailchimpReply = { result: "error", msg: "Something went wrong" };
    await page.goto("/");
    const form = page.getByTestId("lead-magnet").getByRole("form", { name: "Free guide signup" });
    await form.getByLabel("First name").fill("Ana");
    await form.getByLabel("Last name").fill("Rivera");
    await form.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await form.getByRole("button", { name: "Get your free copy" }).click();
    await expect(form.getByRole("alert")).toContainText("couldn't sign you up");
    await expect(page.getByTestId("lead-magnet-success")).toHaveCount(0);
  });
});
