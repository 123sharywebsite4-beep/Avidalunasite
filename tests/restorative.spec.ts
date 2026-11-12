import type { Page } from "@playwright/test";
import { expect, expectMailchimpCall, mockRequests, NO_PAYMENTS, resetMock, test } from "./helpers";

// Restorative-only visits on /book/restorative: Netlify form "restorative-request" first, then
// Stripe (payments on, port 3200), or a pay-at-visit request (payments off, port 3201).

/** A date and time in Florida, `days` from today, as the datetime-local field expects it. */
function floridaTime(days: number, time = "10:00"): string {
  const d = new Date(Date.now() + days * 86_400_000);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
  return `${date}T${time}`;
}

/** Florida time `hours` from now, to the minute. */
function floridaInHours(hours: number): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(Date.now() + hours * 3_600_000))
    .replace(" ", "T");
}

const form = (page: Page) => page.getByRole("form", { name: "Book a restorative visit" });

async function fillDetails(page: Page, when = floridaTime(5)) {
  const f = form(page);
  await f.getByLabel("First name").fill("Ana");
  await f.getByLabel("Last name").fill("Rivera");
  await f.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await f.getByLabel("Phone").fill("941 555 0100");
  await f.getByLabel("City or ZIP code").fill("34202");
  await f.getByLabel("Preferred date and time").fill(when);
  return f;
}

/** Body for /api/restorative-checkout: Luna Light + boots, $45 + $35 + $8 travel = $88. */
const validBody = () => ({
  selection: "package:luna-light",
  extras: ["addon-compression-boots"],
  preferredTime: floridaTime(5),
  email: "ana@example.com",
  shownTotalCents: 8800,
});

async function lastStripeSession(request: Parameters<typeof mockRequests>[0]) {
  const calls = (await mockRequests(request)).filter((r) => r.method === "POST" && r.path === "/v1/checkout/sessions");
  return calls.length ? new URLSearchParams(calls[calls.length - 1].body) : null;
}

test.describe("restorative booking page", () => {
  test("old links move to /book/restorative, with the package chosen", async ({ page }) => {
    await page.goto("/book?package=luna-light");
    await expect(page).toHaveURL(/\/book\/restorative\?package=luna-light$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Book a restorative visit");
    await expect(page).toHaveTitle("Book Red Light & Compression Boots at Home | Avida Luna");
    await expect(form(page).getByRole("radio", { name: /Luna Light/ })).toBeChecked();
    await expect(form(page).getByTestId("restorative-grand-total")).toHaveText("$53");

    await page.goto("/book?restorative=1");
    await expect(page).toHaveURL(/\/book\/restorative/);
    await expect(form(page).getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(form(page).getByTestId("restorative-grand-total")).toHaveText("—");

    // /book itself stays the IV flow.
    await page.goto("/book");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Book your mobile IV appointment");
    await expect(page.getByRole("link", { name: "Book a restorative visit" })).toHaveAttribute("href", "/book/restorative");
  });

  test("heading, intro and form wording match the paid-online flow", async ({ page }) => {
    await page.goto("/book/restorative");
    await expect(page.locator(".page-hero")).toContainText(
      "Red light, compression boots and aromatherapy at your home or office. No IV and no health screening. Choose your package or service, pick a date and time, and pay securely online. Shary confirms your time by text or email.",
    );
    const f = form(page);
    await expect(f).toContainText("NON-MEDICAL · NO IV NEEDED");
    await expect(f.getByRole("heading", { level: 2 })).toHaveText("Choose your visit");
    await expect(f.getByRole("button", { name: "Continue to payment" })).toBeVisible();
    await expect(f.getByTestId("refund-note")).toHaveText(
      "Your date and time are a request until Shary confirms by text or email. If she can't make it and no other time works for you, you'll get a full refund.",
    );
    await expect(f).toContainText("Total, paid online now");
    await expect(f).not.toContainText(/paid at your visit|Nothing is paid now|First choice|Second choice/);
    await expect(f.getByLabel("Preferred date and time")).toHaveAttribute("min", /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test("a Luna package: Netlify form first, then Stripe with the same reference, then the success page", async ({ page, mocks, request }) => {
    await resetMock(request);
    const when = floridaTime(5);
    await page.goto("/book/restorative?package=luna-light");
    const f = form(page);
    // Luna Light already includes red light and aromatherapy, so only boots and the spray are offered.
    const extras = f.getByTestId("restorative-enhancements");
    await expect(extras.getByRole("checkbox", { name: /Targeted Red Light/ })).toHaveCount(0);
    await expect(extras.getByRole("checkbox", { name: /Aromatherapy/ })).toHaveCount(0);
    await extras.getByRole("checkbox", { name: /Compression Boots/ }).check();
    await expect(f.getByTestId("restorative-grand-total")).toHaveText("$88");
    await fillDetails(page, when);
    await f.getByRole("button", { name: "Continue to payment" }).click();

    await expect(page).toHaveURL(/\/book\/restorative\/success\?session_id=cs_test_mock/);
    const paid = page.getByTestId("restorative-paid");
    await expect(paid).toContainText("Payment received. Thank you!");
    await expect(paid).toContainText("Shary will confirm your time by text or email.");
    await expect(paid).toContainText("$88");

    // Shary got the details, marked as paying online, with the reference.
    expect(mocks.netlify).toHaveLength(1);
    const sent = Object.fromEntries(mocks.netlify[0]);
    const reference = sent.reference;
    expect(reference).toMatch(/^AL-[A-HJ-NP-Z2-9]{6}$/);
    expect(sent).toEqual({
      "form-name": "restorative-request",
      firstName: "Ana",
      lastName: "Rivera",
      email: "ana@example.com",
      phone: "941 555 0100",
      cityZip: "34202",
      selection: "Luna Light: $45",
      enhancements: "Compression Boots: $35",
      travelFee: "$8",
      total: "$88",
      preferredTime: expect.stringMatching(/ at 10:00 AM \(Florida time\)$/),
      payment: "Paying online by card (Stripe). Only paid once a Stripe payment with this reference shows.",
      reference,
      optIn: "no",
      "bot-field": "",
    });
    await expect(page.getByTestId("restorative-reference")).toHaveText(reference);

    // Stripe got server prices, ids and the reference: no name, phone or address.
    const stripe = (await lastStripeSession(request))!;
    expect(stripe.get("line_items[0][price_data][product_data][name]")).toBe("Luna Light");
    expect(stripe.get("line_items[0][price_data][unit_amount]")).toBe("4500");
    expect(stripe.get("line_items[1][price_data][product_data][name]")).toBe("Compression Boots (enhancement)");
    expect(stripe.get("line_items[1][price_data][unit_amount]")).toBe("3500");
    expect(stripe.get("line_items[2][price_data][product_data][name]")).toBe("Travel fee");
    expect(stripe.get("line_items[2][price_data][unit_amount]")).toBe("800");
    expect(stripe.get("metadata[kind]")).toBe("restorative");
    expect(stripe.get("metadata[reference]")).toBe(reference);
    expect(stripe.get("metadata[selection]")).toBe("package:luna-light");
    expect(stripe.get("metadata[extras]")).toBe("addon-compression-boots");
    expect(stripe.get("metadata[preferredTime]")).toBe(when);
    expect(stripe.get("client_reference_id")).toBe(reference);
    expect(stripe.get("customer_email")).toBe("ana@example.com");
    expect(stripe.get("success_url")).toMatch(/\/book\/restorative\/success\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    expect(stripe.get("cancel_url")).toMatch(/\/book\/restorative\/cancel$/);
    expect(stripe.has("custom_fields[0][key]")).toBe(false);
    expect([...stripe.values()].join(" ")).not.toMatch(/Rivera|941 555|34202/);

    await expect.poll(() => mocks.mailchimp.length).toBe(1);
    expectMailchimpCall(mocks.mailchimp[0], { EMAIL: "ana@example.com", SOURCE: "restorative", OPTIN: "no" });
    expect(await page.evaluate(() => sessionStorage.getItem("avidaluna:restorative"))).toBeNull();
    expect(page.url()).not.toMatch(/ana|rivera|example\.com|%40/i);
  });

  test("needs a choice, details and a valid date; nothing is charged if Netlify fails", async ({ page, mocks, request }) => {
    await resetMock(request);
    await page.goto("/book/restorative");
    const f = form(page);
    await f.getByRole("button", { name: "Continue to payment" }).click();
    await expect(f.getByText("Please choose a package or service.")).toBeVisible();
    await expect(f.getByText("Please enter your name.").first()).toBeVisible();
    await expect(f.getByText("Please choose a date and time.")).toBeVisible();

    await f.getByRole("radio", { name: /^Targeted Red Light/ }).check();
    await expect(f.getByTestId("restorative-grand-total")).toHaveText("$37");
    await fillDetails(page, floridaTime(-2));
    await f.getByRole("button", { name: "Continue to payment" }).click();
    await expect(f.getByText("That time has already passed. Please choose a later one.")).toBeVisible();

    await f.getByLabel("Preferred date and time").fill(floridaInHours(3));
    await f.getByRole("button", { name: "Continue to payment" }).click();
    await expect(f.getByText("Please choose a time at least 24 hours from now.")).toBeVisible();

    await f.getByLabel("Preferred date and time").fill(floridaTime(120));
    await f.getByRole("button", { name: "Continue to payment" }).click();
    await expect(f.getByText("Please choose a date within the next 90 days.")).toBeVisible();
    expect(mocks.netlify).toHaveLength(0);

    mocks.netlifyFails = true;
    await f.getByLabel("Preferred date and time").fill(floridaTime(5));
    await f.getByRole("button", { name: "Continue to payment" }).click();
    await expect(f.getByText("Sorry, that didn't send, and nothing was charged. Please try again, or call or text Shary.")).toBeVisible();
    await expect(page).toHaveURL(/\/book\/restorative$/);
    await page.waitForTimeout(300);
    expect(mocks.mailchimp).toHaveLength(0);
  });

  test("the cancel page restores the form, and can send it as a pay-at-visit request", async ({ page, mocks }) => {
    await page.goto("/book/restorative");
    const when = floridaTime(6, "14:30");
    await page.evaluate(
      ([w]) =>
        sessionStorage.setItem(
          "avidaluna:restorative",
          JSON.stringify({
            selection: "package:luna-reset",
            extras: ["addon-aromatherapy"],
            preferredTime: w,
            firstName: "Ana",
            lastName: "Rivera",
            email: "ana@example.com",
            phone: "941 555 0100",
            cityZip: "34202",
            optIn: true,
            reference: "AL-7K3QPX",
          }),
        ),
      [when],
    );
    await page.goto("/book/restorative/cancel");
    await expect(page.getByTestId("restorative-cancelled")).toContainText("No charge was made.");
    const f = form(page);
    await expect(f.getByRole("radio", { name: /Luna Reset/ })).toBeChecked();
    await expect(f.getByRole("checkbox", { name: /Aromatherapy/ })).toBeChecked();
    await expect(f.getByLabel("First name")).toHaveValue("Ana");
    await expect(f.getByLabel("City or ZIP code")).toHaveValue("34202");
    await expect(f.getByLabel("Preferred date and time")).toHaveValue(when);
    await expect(f.getByRole("checkbox", { name: /email me Avida Luna news/ })).toBeChecked();
    await expect(f.getByTestId("restorative-grand-total")).toHaveText("$88");
    await expect(f.getByRole("button", { name: "Continue to payment" })).toBeVisible();

    await f.getByRole("button", { name: "Send as a request and pay at my visit" }).click();
    await expect(page.getByTestId("restorative-success")).toContainText("is paid at your visit");
    expect(mocks.netlify).toHaveLength(1);
    expect(mocks.netlify[0].get("payment")).toBe("Pay at visit (online checkout was cancelled)");
    expect(mocks.netlify[0].get("reference")).toBe("AL-7K3QPX");
    expect(mocks.netlify[0].get("selection")).toBe("Luna Reset: $65");
    expect(mocks.netlify[0].get("enhancements")).toBe("Aromatherapy: $15");
    expect(mocks.netlify[0].get("total")).toBe("$88");
    expect(await page.evaluate(() => sessionStorage.getItem("avidaluna:restorative"))).toBeNull();
  });

  test("the success page only confirms a paid restorative session", async ({ page }) => {
    await page.goto("/book/restorative/success?session_id=not-a-session");
    await expect(page.getByTestId("restorative-unconfirmed")).toContainText("We couldn't confirm this payment.");
  });

  test("other pages link to the new page and say restorative visits are paid online", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("link", { name: "Book a restorative visit" })).toHaveAttribute("href", "/book/restorative");
    await expect(page.locator("#add-ons")).toContainText("paid securely online when you book");
    await page.goto("/add-ons");
    await expect(page.getByRole("link", { name: "book a restorative visit" })).toHaveAttribute("href", "/book/restorative");
    await page.goto("/terms");
    await expect(page.locator("main")).toContainText("paid online by card when you book");
    await page.goto("/privacy");
    await expect(page.locator("main")).toContainText("your preferred date and time, and a booking reference");
    await expect(page.locator("main")).not.toContainText("two or three");
  });

  test("passes axe (WCAG 2.2 AA), including the cancel page", async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    for (const url of ["/book/restorative", "/book/restorative/cancel"]) {
      await page.goto(url);
      await expect(form(page)).toBeVisible();
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations.map((v) => `${url} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });
});

test.describe("restorative checkout API", () => {
  const post = (request: Parameters<typeof mockRequests>[0], data: unknown) =>
    request.post("/api/restorative-checkout", { data });

  test("prices come from the server: price fields from the browser are ignored", async ({ request }) => {
    await resetMock(request);
    const res = await post(request, {
      ...validBody(),
      price: 1,
      total: 1,
      lines: [{ id: "package:luna-light", unitAmountCents: 100 }],
      travelFee: 0,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.reference).toMatch(/^AL-[A-HJ-NP-Z2-9]{6}$/);
    expect(body.totalCents).toBe(8800);
    const stripe = (await lastStripeSession(request))!;
    expect(stripe.get("line_items[0][price_data][unit_amount]")).toBe("4500");
    expect(stripe.get("line_items[2][price_data][unit_amount]")).toBe("800");
  });

  test("a total that doesn't match the current prices returns 409", async ({ request }) => {
    const res = await post(request, { ...validBody(), shownTotalCents: 100 });
    expect(res.status()).toBe(409);
    expect((await res.json()).error).toMatch(/Prices have changed/);
  });

  test("unknown, closed or non-restorative packages return 409", async ({ request }) => {
    for (const selection of ["package:luna-nope", "package:b12-and-light", "package:hydrate-and-unwind", "item:not-a-thing"]) {
      const res = await post(request, { ...validBody(), selection, extras: [] });
      expect(res.status(), selection).toBe(409);
    }
  });

  test("an enhancement already included, or unknown, returns 409", async ({ request }) => {
    for (const extras of [["addon-red-light"], ["addon-made-up"]]) {
      const res = await post(request, { ...validBody(), extras });
      expect(res.status(), extras[0]).toBe(409);
    }
  });

  test("a past date, a date under 24 hours away and one over 90 days out return 400", async ({ request }) => {
    for (const preferredTime of [floridaTime(-1), floridaInHours(3), floridaTime(91), "2030-02-30T10:00", "soon"]) {
      const res = await post(request, { ...validBody(), preferredTime });
      expect(res.status(), preferredTime).toBe(400);
    }
  });

  test("a reference in the wrong format returns 400; a valid one is kept", async ({ request }) => {
    expect((await post(request, { ...validBody(), reference: "AL-0000" })).status()).toBe(400);
    const res = await post(request, { ...validBody(), reference: "AL-7K3QPX" });
    expect((await res.json()).reference).toBe("AL-7K3QPX");
  });
});

test.describe("with online payment off (no Stripe keys)", () => {
  test("the page is a pay-at-visit request, sent to Shary through Netlify", async ({ page, mocks }) => {
    await page.goto(`${NO_PAYMENTS}/book/restorative?package=luna-signature-reset`);
    await expect(page.locator(".page-hero")).toContainText(
      "Choose your package or service, pick a date and time, and pay at your visit. Shary confirms your time by text or email.",
    );
    const f = form(page);
    await expect(f.getByRole("radio", { name: /Luna Signature Reset/ })).toBeChecked();
    await expect(f).toContainText("Total, paid at your visit");
    await expect(f.getByTestId("refund-note")).toHaveCount(0);
    await expect(f.getByRole("button", { name: "Continue to payment" })).toHaveCount(0);
    await fillDetails(page);
    await f.getByRole("button", { name: "Send my request" }).click();
    await expect(page.getByTestId("restorative-success")).toContainText("Thanks! Shary will confirm your time by text or email.");
    await expect(page.getByTestId("restorative-success")).toContainText("Your total of $87 (including the $8 travel fee) is paid at your visit.");
    expect(mocks.netlify).toHaveLength(1);
    expect(mocks.netlify[0].get("payment")).toBe("Pay at visit");
    expect(mocks.netlify[0].get("reference")).toMatch(/^AL-[A-HJ-NP-Z2-9]{6}$/);
    expect(mocks.netlify[0].get("total")).toBe("$87");
  });

  test("other pages say pay at your visit", async ({ page }) => {
    await page.goto(`${NO_PAYMENTS}/packages`);
    await expect(page.locator("#restorative .iv-note")).toContainText("you pay at your visit");
    await page.goto(`${NO_PAYMENTS}/terms`);
    await expect(page.locator("main")).toContainText("are non-medical and are paid at your visit");
  });

  test("the checkout API returns 503", async ({ request }) => {
    const res = await request.post(`${NO_PAYMENTS}/api/restorative-checkout`, { data: validBody() });
    expect(res.status()).toBe(503);
    expect((await res.json()).error).toMatch(/Online payment isn't available right now/);
  });
});
