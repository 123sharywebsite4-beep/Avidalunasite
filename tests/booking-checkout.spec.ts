import type { Page } from "@playwright/test";
import Stripe from "stripe";
import { expect, mockRequests, resetMock, test } from "./helpers";

// Step 1 -> Book now (new tab) -> back to this tab -> step 3 add-ons -> checkout or pay at the visit.

const HYDREIGHT = "https://booking.hydreight.com/widget-business/an92x";
let ipCounter = 0;

test.beforeEach(async ({ context, request }, info) => {
  await resetMock(request);
  // Each test is its own visitor, so the per-IP limits don't carry over between tests.
  await context.setExtraHTTPHeaders({ "x-forwarded-for": `10.9.${info.project.name.length}.${++ipCounter}` });
  // Never load the real Hydreight page in tests; the new tab just needs to open.
  await context.route("https://booking.hydreight.com/**", (r) => r.fulfill({ body: "<title>Booking</title>" }));
});

function uniqueEmail(tag: string) {
  return `${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}@example.com`;
}

async function completeStep1(page: Page, email: string) {
  await page.goto("/book");
  await page.getByLabel("First name").fill("Ana");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Get my booking link" }).click();
  await expect(page.getByTestId("hydreight-button")).toBeVisible();
}

/** What a real tab switch does: the page goes hidden, then visible again. */
async function leaveAndReturn(page: Page) {
  await page.evaluate(() => {
    const set = (v: string) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    set("hidden");
    set("visible");
  });
}

async function signedWebhook(page: Page, object: Record<string, unknown>) {
  const payload = JSON.stringify({
    id: "evt_test",
    object: "event",
    type: "checkout.session.completed",
    data: { object },
  });
  const header = new Stripe("sk_test_mock").webhooks.generateTestHeaderString({ payload, secret: "whsec_test_mock" });
  return page.request.post("/api/stripe/webhook", {
    data: payload,
    headers: { "stripe-signature": header, "content-type": "application/json" },
  });
}

test("the hint about the email shows under the step 1 email field", async ({ page }) => {
  await page.goto("/book");
  await expect(page.getByText("We'll email your booking link and visit details.")).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toHaveAccessibleDescription(
    "We'll email your booking link and visit details.",
  );
});

test("Book now, return to the tab, step 3, pay by card", async ({ page, request }) => {
  const email = uniqueEmail("flow");
  await completeStep1(page, email);

  // Coming back without clicking Book now does nothing.
  await leaveAndReturn(page);
  await expect(page.getByTestId("hydreight-button")).toBeVisible();

  const popup = page.waitForEvent("popup");
  await page.getByTestId("hydreight-button").click();
  expect((await popup).url()).toBe(HYDREIGHT);
  expect(await page.evaluate(() => sessionStorage.getItem("avidaluna:bookClicked"))).toBe("1");

  await leaveAndReturn(page);
  const step3 = page.getByTestId("book-addons");
  await expect(step3.getByRole("heading", { name: "Booked? Make it a ritual." })).toBeVisible();
  await expect(step3.getByRole("button", { name: "No thanks, I'm all set" })).toBeVisible();
  await expect(step3.getByRole("link", { name: /Book here/ })).toHaveAttribute("href", HYDREIGHT);
  await expect(page.locator('.booking-progress [aria-current="step"]')).toContainText("Add-ons & visit");

  // Refresh keeps them on step 3.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Booked? Make it a ritual." })).toBeVisible();

  await page.getByRole("button", { name: "Add one Targeted Red Light" }).click();
  await page.getByRole("button", { name: "Pay now by card" }).locator("visible=true").click();
  await page.waitForURL(/\/add-ons\/success\?session_id=cs_test_mock/);
  await expect(page.getByRole("heading", { name: "You're all set." })).toBeVisible();

  const checkout = (await mockRequests(request)).find((c) => c.path === "/v1/checkout/sessions" && c.method === "POST");
  const form = new URLSearchParams(checkout!.body);
  expect(form.get("customer_email")).toBe(email);
  expect([...form.keys()].filter((k) => k.startsWith("metadata["))).toEqual(["metadata[addons]"]);
});

test("the webhook accepts signed events and rejects forged ones", async ({ page }) => {
  for (const payment_status of ["paid", "unpaid"]) {
    const res = await signedWebhook(page, {
      id: "cs_test_1",
      object: "checkout.session",
      payment_status,
      amount_total: 2900,
      customer_details: { email: "ana@example.com" },
      metadata: { addons: "addon-red-lightx1" },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ received: true });
  }
  const forged = await page.request.post("/api/stripe/webhook", {
    data: "{}",
    headers: { "stripe-signature": "t=1,v1=bad" },
  });
  expect(forged.status()).toBe(400);
  const unsigned = await page.request.post("/api/stripe/webhook", { data: "{}" });
  expect(unsigned.status()).toBe(400);
});

test("fallback button opens step 3 when the tab never switched; No thanks is respected", async ({ page }) => {
  await completeStep1(page, uniqueEmail("fallback"));
  await page.getByRole("button", { name: "I've booked, show me add-ons" }).click();
  await expect(page.getByRole("heading", { name: "Booked? Make it a ritual." })).toBeVisible();

  await page.getByRole("button", { name: "No thanks, I'm all set" }).click();
  await expect(page.getByTestId("book-skipped")).toContainText("You're all set, Ana.");
  await page.reload();
  await expect(page.getByTestId("book-skipped")).toBeVisible();
  await page.getByRole("button", { name: "Show me add-ons" }).click();
  await expect(page.getByTestId("book-addons")).toBeVisible();
});

test("the text link counts as Book now too", async ({ page }) => {
  await completeStep1(page, uniqueEmail("textlink"));
  const popup = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Open the secure booking page" }).click();
  await popup;
  await leaveAndReturn(page);
  await expect(page.getByTestId("book-addons")).toBeVisible();
});

test("pay at my visit from step 3 sends Shary \"booking-extras\" with the step 1 details", async ({ page, mocks }) => {
  const email = uniqueEmail("atvisit");
  await completeStep1(page, email);
  await page.getByRole("button", { name: "I've booked, show me add-ons" }).click();
  await page.getByRole("button", { name: "Add one Aromatherapy" }).click();
  await page.getByRole("button", { name: "Pay at my visit" }).locator("visible=true").click();
  const dialog = page.getByTestId("at-visit-dialog");
  await expect(dialog.getByLabel("First name")).toHaveValue("Ana");
  await expect(dialog.getByLabel("Last name")).toHaveValue("Rivera");
  await expect(dialog.getByLabel("Email")).toHaveValue(email);
  await dialog.getByRole("button", { name: "Confirm enhancements" }).click();
  await expect(dialog.getByRole("heading", { name: "You're all set." })).toBeVisible();
  expect(mocks.netlify).toHaveLength(1);
  expect(Object.fromEntries(mocks.netlify[0])).toEqual({
    "form-name": "booking-extras",
    name: "Ana Rivera",
    email,
    package: "None",
    items: "Enhancement: Aromatherapy × 1: $15",
    dueAtVisit: "$15",
    "bot-field": "",
  });
});

test("steps 2 and 3 pass axe (WCAG 2.2 AA)", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const check = async () => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  };
  await completeStep1(page, uniqueEmail("axe"));
  await check();
  await page.getByRole("button", { name: "I've booked, show me add-ons" }).click();
  await expect(page.getByTestId("book-addons")).toBeVisible();
  await check();
});
