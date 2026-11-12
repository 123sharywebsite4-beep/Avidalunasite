import type { Page } from "@playwright/test";
import { expect, expectMailchimpCall, mockRequests, NO_PAYMENTS, resetMock, test } from "./helpers";

// Restorative-only visits on /book/restorative: Netlify form "restorative-request" first, then
// Stripe (payments on, port 3200), or a pay-at-visit request (payments off, port 3201).

/** A date and time in Florida, `days` from today, in the "YYYY-MM-DDTHH:mm" wire format. */
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

/** A time inside 10 AM to 5 PM that's still less than 24 hours away: today at 5 PM, or tomorrow at 10 AM. */
function soonButInHours(): string {
  const now = floridaInHours(0);
  return now.slice(11) < "17:00" ? `${now.slice(0, 10)}T17:00` : floridaTime(1, "10:00");
}

const form = (page: Page) => page.getByRole("form", { name: "Book a restorative visit" });

async function fillDetails(page: Page, when = floridaTime(5)) {
  const f = form(page);
  await f.getByLabel("First name").fill("Ana");
  await f.getByLabel("Last name").fill("Rivera");
  await f.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await f.getByLabel("Phone").fill("941 555 0100");
  await f.getByLabel("City or ZIP code").fill("34202");
  await pickTime(page, when);
  return f;
}

/** Chooses a "YYYY-MM-DDTHH:mm" Florida time in the two dropdowns. */
async function pickTime(page: Page, when: string) {
  const f = form(page);
  await f.getByLabel("Preferred date", { exact: true }).selectOption(when.slice(0, 10));
  await f.getByLabel("Preferred time", { exact: true }).selectOption(when.slice(11));
}

/** "2026-11-26" -> "Thursday, November 26, 2026", independently of the site's own formatter. */
const usDate = (ymd: string) =>
  new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

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
    await expect(f.getByRole("group", { name: "Preferred date and time" })).toContainText(
      "Florida time. 10:00 AM to 5:00 PM, at least 24 hours from now and within the next 90 days.",
    );
  });

  test("the date and time are dropdowns in US format that only offer bookable times", async ({ page }) => {
    await page.goto("/book/restorative");
    const f = form(page);
    const date = f.getByLabel("Preferred date", { exact: true });
    const time = f.getByLabel("Preferred time", { exact: true });
    await expect(date).toHaveJSProperty("tagName", "SELECT");
    await expect(f.locator('input[type="date"], input[type="datetime-local"]')).toHaveCount(0);
    await expect(time).toBeDisabled();

    const dates = await date.locator("option:not([value=''])").evaluateAll((o) =>
      o.map((x) => ({ value: (x as HTMLOptionElement).value, label: x.textContent })),
    );
    // Never today (24 hours' notice), never more than 90 days out, always "Weekday, Month D, YYYY".
    const today = floridaTime(0).slice(0, 10);
    expect(dates.every((d) => d.value > today)).toBe(true);
    expect(dates.at(-1)!.value <= floridaTime(90).slice(0, 10)).toBe(true);
    expect(dates.length).toBeGreaterThanOrEqual(89);
    for (const d of dates) expect(d.label).toBe(usDate(d.value));

    const fiveDays = floridaTime(5).slice(0, 10);
    await date.selectOption(fiveDays);
    await expect(time).toBeEnabled();
    const times = await time.locator("option:not([value=''])").allTextContents();
    expect(times).toEqual([
      "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
      "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM",
    ]);
  });

  test("the dropdowns show US format even on a UK-set device in another time zone", async ({ browser }) => {
    const context = await browser.newContext({ locale: "en-GB", timezoneId: "Europe/London" });
    const page = await context.newPage();
    await page.goto("/book/restorative");
    const date = form(page).getByLabel("Preferred date", { exact: true });
    const first = await date.locator("option:not([value=''])").first();
    const value = await first.getAttribute("value");
    // Built from Florida time, so a London evening doesn't move the first bookable day.
    expect(value! > floridaTime(0).slice(0, 10)).toBe(true);
    await expect(first).toHaveText(usDate(value!));
    await context.close();
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
    await expect(paid).toContainText(`You asked for ${usDate(when.slice(0, 10))} at 10:00 AM (Florida time).`);

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
      // Exactly the day and time picked: no time zone shift between the form, Shary and Stripe.
      preferredTime: `${usDate(when.slice(0, 10))} at 10:00 AM (Florida time)`,
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
    expect(stripe.get("metadata[preferredTimeFlorida]")).toBe(`${usDate(when.slice(0, 10))} at 10:00 AM (Florida time)`);
    expect(stripe.get("payment_intent_data[description]")).toContain(`${usDate(when.slice(0, 10))} at 10:00 AM (Florida time)`);
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
    // A date with no time still isn't enough.
    await fillDetails(page);
    await f.getByLabel("Preferred time", { exact: true }).selectOption("");
    await f.getByRole("button", { name: "Continue to payment" }).click();
    await expect(f.getByText("Please choose a date and time.")).toBeVisible();
    expect(mocks.netlify).toHaveLength(0);

    mocks.netlifyFails = true;
    await pickTime(page, floridaTime(5));
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
    await expect(f.getByLabel("Preferred date", { exact: true })).toHaveValue(when.slice(0, 10));
    await expect(f.getByLabel("Preferred time", { exact: true })).toHaveValue("14:30");
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
    expect(mocks.netlify[0].get("preferredTime")).toBe(`${usDate(when.slice(0, 10))} at 2:30 PM (Florida time)`);
    await expect(page.getByTestId("restorative-when")).toHaveText(`You asked for ${usDate(when.slice(0, 10))} at 2:30 PM (Florida time).`);
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

  test("the server enforces the booking hours, so the form can't be bypassed", async ({ request }) => {
    const cases: [string, string][] = [
      [floridaTime(-1, "14:00"), "That date has already passed. Please choose a date at least 24 hours from now."],
      [soonButInHours(), "Please choose a date at least 24 hours from now."],
      [floridaTime(91, "14:00"), "Please choose a date within the next 90 days."],
      [floridaTime(5, "09:30"), "Please choose a time between 10:00 AM and 5:00 PM."],
      [floridaTime(5, "17:30"), "Please choose a time between 10:00 AM and 5:00 PM."],
      [floridaTime(5, "00:46"), "Please choose a time between 10:00 AM and 5:00 PM."],
      ["2030-02-30T10:00", "Please choose a date and time."],
      ["11/12/2026 10:00 AM", "Please choose a date and time."],
    ];
    // Its own client IP, so these ten calls don't use up the route's rate limit for the other tests.
    const headers = { "x-forwarded-for": "10.77.0.1" };
    for (const [preferredTime, message] of cases) {
      const res = await request.post("/api/restorative-checkout", { data: { ...validBody(), preferredTime }, headers });
      expect(res.status(), preferredTime).toBe(400);
      expect((await res.json()).fields?.preferredTime, preferredTime).toBe(message);
    }
    for (const preferredTime of [floridaTime(5, "10:00"), floridaTime(5, "17:00")]) {
      const res = await request.post("/api/restorative-checkout", { data: { ...validBody(), preferredTime }, headers });
      expect(res.status(), preferredTime).toBe(200);
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
