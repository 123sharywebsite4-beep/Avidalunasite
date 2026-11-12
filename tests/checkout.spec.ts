import { expect, mockRequests, resetMock, test } from "./helpers";

test.describe("add-on checkout", () => {
  test("Pay buttons are disabled until a ritual is chosen", async ({ page }) => {
    await page.goto("/add-ons");
    const pay = page.getByRole("button", { name: "Pay now by card" }).locator("visible=true");
    const atVisit = page.getByRole("button", { name: "Pay at my visit" }).locator("visible=true");
    await expect(pay).toBeDisabled();
    await expect(atVisit).toBeDisabled();
    await page.getByRole("button", { name: "Add one Targeted Red Light" }).click();
    await expect(pay).toBeEnabled();
    await expect(atVisit).toBeEnabled();
  });

  test("pay at my visit sends Shary the add-ons through Netlify Forms", async ({ page, mocks }) => {
    await page.goto("/add-ons");
    await page.evaluate(() => {
      sessionStorage.setItem("avidaluna:firstName", "Ana");
      sessionStorage.setItem("avidaluna:email", "ana@example.com");
    });
    await page.getByRole("button", { name: "Add one Targeted Red Light" }).click();
    await page.getByRole("button", { name: "Pay at my visit" }).locator("visible=true").click();
    const dialog = page.getByTestId("at-visit-dialog");
    await expect(dialog.getByLabel("First name")).toHaveValue("Ana");
    await expect(dialog.getByLabel("Email")).toHaveValue("ana@example.com");
    await dialog.getByRole("button", { name: "Confirm enhancements" }).click();
    await expect(dialog.getByRole("heading", { name: "You're all set." })).toBeVisible();

    expect(mocks.netlify).toHaveLength(1);
    const sent = mocks.netlify[0];
    expect(Object.fromEntries(sent)).toEqual({
      "form-name": "add-ons-at-visit",
      firstName: "Ana",
      email: "ana@example.com",
      addOns: "Targeted Red Light × 1: $25",
      total: "$25",
      "bot-field": "",
    });
    expect(mocks.mailchimp).toHaveLength(0);
    expect(page.url()).not.toMatch(/ana|example\.com|%40/i);
  });

  test("pay at my visit needs a name and email, and says so if Netlify fails", async ({ page, mocks }) => {
    await page.goto("/add-ons");
    await page.getByRole("button", { name: "Add one Targeted Red Light" }).click();
    await page.getByRole("button", { name: "Pay at my visit" }).locator("visible=true").click();
    const dialog = page.getByTestId("at-visit-dialog");
    await dialog.getByRole("button", { name: "Confirm enhancements" }).click();
    await expect(dialog.getByText("Please enter your name.")).toBeVisible();
    expect(mocks.netlify).toHaveLength(0);

    mocks.netlifyFails = true;
    await dialog.getByLabel("First name").fill("Ana");
    await dialog.getByLabel("Email").fill("ana@example.com");
    await dialog.getByRole("button", { name: "Confirm enhancements" }).click();
    await expect(dialog.getByText("Sorry, that didn't send. Please try again, or just tell Shary at your visit.")).toBeVisible();
  });

  test("the API rejects zero items", async ({ request }) => {
    expect((await request.post("/api/checkout", { data: { items: [] } })).status()).toBe(400);
    const zero = await request.post("/api/checkout", { data: { items: [{ id: "addon-red-light", quantity: 0 }] } });
    expect(zero.status()).toBe(400);
  });

  test("rejects unknown items and quantities over 10", async ({ request }) => {
    const unknown = await request.post("/api/checkout", { data: { items: [{ id: "addon-nope", quantity: 1 }] } });
    expect(unknown.status()).toBe(409);
    const tooMany = await request.post("/api/checkout", { data: { items: [{ id: "addon-red-light", quantity: 11 }] } });
    expect(tooMany.status()).toBe(400);
  });

  test("a tampered price in the request is ignored; the server's enhancement price is charged", async ({ request }) => {
    await resetMock(request);
    const res = await request.post("/api/checkout", {
      data: {
        items: [{ id: "addon-red-light", quantity: 2, price: 0.01, unit_amount: 1 }],
        price: 1,
        total: 1,
      },
    });
    expect(res.status()).toBe(200);
    const stripeCall = (await mockRequests(request)).find((c) => c.path === "/v1/checkout/sessions");
    const form = new URLSearchParams(stripeCall!.body);
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("2500");
    expect(form.get("line_items[0][quantity]")).toBe("2");
    expect(form.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(form.get("mode")).toBe("payment");
    expect(form.get("custom_fields[0][label][custom]")).toBe("Appointment date (MM/DD/YYYY)");
    expect(form.get("custom_fields[0][optional]")).toBe("false");
  });

  test("checkout creates a session and the success page lists what was paid", async ({ page, request }) => {
    await resetMock(request);
    await page.goto("/add-ons");
    await page.getByRole("button", { name: "Add one Targeted Red Light" }).click();
    await page.getByRole("button", { name: "Add one Aromatherapy" }).click();
    await page.getByRole("button", { name: "Pay now by card" }).locator("visible=true").click();
    await expect(page).toHaveURL(/\/add-ons\/success\?session_id=cs_test_/);
    await expect(page.getByRole("heading", { name: "You're all set." })).toBeVisible();
    await expect(page.getByText("Targeted Red Light × 1")).toBeVisible();
    await expect(page.getByText("$40")).toBeVisible();
  });

  test("the cancel page restores the selection", async ({ page }) => {
    await page.goto("/add-ons");
    const plus = page.getByRole("button", { name: "Add one Targeted Red Light" });
    await plus.click();
    await plus.click();
    await expect(page.getByLabel("Targeted Red Light: 2")).toBeVisible();
    await page.goto("/add-ons/cancel");
    await expect(page.getByRole("heading", { name: "No charge was made." })).toBeVisible();
    await expect(page.getByLabel("Targeted Red Light: 2")).toBeVisible();
  });

  test("the success page doesn't confirm a made-up session", async ({ page }) => {
    await page.goto("/add-ons/success?session_id=not-a-session");
    await expect(page.getByRole("heading", { name: "We couldn't confirm this payment." })).toBeVisible();
  });
});

test.describe("other endpoints", () => {
  test("Hydreight hook stub requires the secret and returns 501", async ({ request }) => {
    expect((await request.post("/api/hooks/hydreight-booking", { data: {} })).status()).toBe(401);
    const ok = await request.post("/api/hooks/hydreight-booking", {
      data: {},
      headers: { "x-hook-secret": "test-hook-secret" },
    });
    expect(ok.status()).toBe(501);
  });

  test("Stripe webhook rejects unsigned requests", async ({ request }) => {
    expect((await request.post("/api/stripe/webhook", { data: {} })).status()).toBeGreaterThanOrEqual(400);
  });
});
