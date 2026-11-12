import type { Page } from "@playwright/test";
import { expect, expectMailchimpCall, test } from "./helpers";

// Shary's packages and booking rules: the Hydreight / at-visit split, the $8 travel fee for
// restorative-only visits, enhancement filtering and B12 booking staying closed until travel pricing
// for injections is decided. The restorative booking itself is in restorative.spec.ts.

const MEDICAL_LINE =
  "Required medical consultation included. IVs and injections are subject to medical clearance and provider approval.";

test.beforeEach(async ({ context }) => {
  await context.route("https://booking.hydreight.com/**", (r) => r.fulfill({ body: "<title>Booking</title>" }));
});

async function step1(page: Page, url: string) {
  await page.goto(url);
  await page.getByLabel("First name").fill("Ana");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
  await page.getByRole("button", { name: "Get my booking link" }).click();
  await expect(page.getByTestId("hydreight-button")).toBeVisible();
}

test.describe("/packages", () => {
  test("three groups, prices, travel totals, the medical line and booking buttons", async ({ page }) => {
    await page.goto("/packages");
    for (const name of ["Restorative packages", "IV wellness packages", "B12 wellness packages"]) {
      await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
    }

    const light = page.getByTestId("package-luna-light");
    await expect(light).toContainText("Targeted Red Light, 15 minutes");
    await expect(light).toContainText("Aromatherapy");
    await expect(light).toContainText("$45");
    await expect(light).toContainText("$53 with the $8 travel fee");
    await expect(light).not.toContainText(MEDICAL_LINE);
    await expect(light.getByRole("link", { name: /Book this package/ })).toHaveAttribute(
      "href",
      "/book/restorative?package=luna-light",
    );
    // Stripe is on in the test build: restorative visits are paid online, not at the visit.
    const restorativeNote = page.locator("#restorative .iv-note");
    await expect(restorativeNote).toContainText("pay securely online when you book");
    await expect(restorativeNote).not.toContainText("pay at your visit");
    await expect(restorativeNote.getByRole("link", { name: "Book a restorative visit" })).toHaveAttribute("href", "/book/restorative");
    await expect(page.locator("#restorative")).not.toContainText("book directly with Shary");
    await expect(page.getByTestId("package-luna-reset")).toContainText("$73 with the $8 travel fee");
    await expect(page.getByTestId("package-luna-signature-reset")).toContainText("$87 with the $8 travel fee");

    const unwind = page.getByTestId("package-hydrate-and-unwind");
    await expect(unwind).toContainText("Hydration IV (Lactated Ringer's)");
    await expect(unwind).toContainText("$139");
    await expect(unwind).toContainText("$99 on the secure booking page + $40 at your visit");
    await expect(unwind).toContainText(MEDICAL_LINE);
    await expect(unwind).not.toContainText("travel fee");

    const recovery = page.getByTestId("package-recovery-reset");
    await expect(recovery).toContainText("Energy IV or Athlete Recovery IV");
    await expect(recovery).toContainText("$180 on the secure booking page + $29 at your visit");
    await expect(page.getByTestId("package-signature-luna-iv-experience")).toContainText(
      "$199 on the secure booking page + $70 at your visit",
    );
    await expect(page.getByText(/Additional travel charges may apply and will be confirmed before booking\./)).toBeVisible();
    await expect(page.getByTestId("iv-timing").first()).toContainText("IV infusion time: About 35–40 minutes.");
    await expect(page.getByTestId("iv-timing").first()).toContainText("Total appointment time:");

    for (const slug of ["b12-and-light", "b12-and-restore"]) {
      const card = page.getByTestId(`package-${slug}`);
      await expect(card).toContainText(MEDICAL_LINE);
      await expect(card.getByTestId("booking-soon")).toHaveText("Booking opens soon");
      await expect(card.getByRole("link", { name: /Book this package/ })).toHaveCount(0);
    }
    await expect(page.getByTestId("package-b12-and-light")).toContainText("$65");
    await expect(page.getByTestId("package-b12-and-restore")).toContainText("$99");
  });

  test("/services lists the packages and IM injections, with injection booking not open yet", async ({ page }) => {
    await page.goto("/services");
    await expect(page.getByRole("heading", { name: "Wellness packages" })).toBeVisible();
    for (const name of ["B12 IM Injection", "B-Complex IM Injection", "Glutathione IM Injection"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    await expect(page.getByTestId("injection-booking-soon")).toHaveText("Booking opens soon");
    await expect(page.getByRole("link", { name: /Book an injection/ })).toHaveCount(0);
    for (const name of ["B12 IV Add-On", "B-Complex IV Add-On", "Glutathione IV Add-On", "Detox/Hangover IV", "Migraine IV"]) {
      await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    }
    // Aromatherapy never shows a 45-minute duration anywhere.
    await expect(page.locator("body")).not.toContainText(/45\s*min/);
    await expect(
      page.getByText("Aromatherapy — duration is based on your selected service and continues throughout that service.").first(),
    ).toBeVisible();
  });
});

test.describe("IV package booking (/book?package=…)", () => {
  test("step 1 shows the package and the Hydreight / at-visit split", async ({ page }) => {
    await page.goto("/book?package=hydrate-and-unwind");
    const summary = page.getByTestId("package-summary");
    await expect(summary.getByRole("heading", { name: "Hydrate & Unwind" })).toBeVisible();
    await expect(summary.getByTestId("split-online")).toHaveText("$99");
    await expect(summary.getByTestId("split-visit")).toHaveText("$40");
    await expect(summary).toContainText("Hydration IV (Lactated Ringer's): paid on our secure booking page");
    await expect(summary).toContainText("Targeted Red Light, Aromatherapy: paid at your visit");
    await expect(summary).toContainText("Package price$139");
    await expect(summary).toContainText(MEDICAL_LINE);
    await expect(summary).toContainText("Additional travel charges may apply and will be confirmed before booking.");
    await expect(summary).not.toContainText("$8");
    await expect(summary.getByTestId("iv-timing")).toContainText("IV infusion time: About 35–40 minutes.");
  });

  test("enhancements leave out what the package includes, and Shary gets booking-extras", async ({ page, mocks }) => {
    await step1(page, "/book?package=hydrate-and-unwind");
    await expect.poll(() => mocks.mailchimp.length).toBe(1);
    expectMailchimpCall(mocks.mailchimp[0], { SOURCE: "booking" });
    await page.getByRole("button", { name: "I've booked, confirm my package" }).click();
    const list = page.getByRole("list", { name: "Enhancements" });
    await expect(list.getByTestId("addon-addon-compression-boots")).toContainText("$35");
    await expect(list.getByTestId("addon-addon-vitamin-spray")).toContainText("$35");
    await expect(list.getByTestId("addon-addon-red-light")).toHaveCount(0);
    await expect(list.getByTestId("addon-addon-aromatherapy")).toHaveCount(0);

    await page.getByRole("button", { name: "Add one Compression Boots" }).click();
    await page.getByRole("button", { name: "Pay at my visit" }).locator("visible=true").click();
    const dialog = page.getByTestId("at-visit-dialog");
    await expect(dialog).toContainText("$75 at your visit");
    await dialog.getByRole("button", { name: "Confirm my package" }).click();
    await expect(dialog.getByRole("heading", { name: "You're all set." })).toBeVisible();

    expect(mocks.netlify).toHaveLength(1);
    expect(Object.fromEntries(mocks.netlify[0])).toEqual({
      "form-name": "booking-extras",
      name: "Ana Rivera",
      email: "ana@example.com",
      package: "Hydrate & Unwind",
      items:
        "Hydrate & Unwind (package, at visit): Targeted Red Light, Aromatherapy: $40\nEnhancement: Compression Boots × 1: $35",
      dueAtVisit: "$75",
      "bot-field": "",
    });
    // Never the IV itself.
    expect(mocks.netlify[0].get("items")).not.toMatch(/Hydration|IV\b/);
  });

  test("Recovery Reset never asks which IV, and booking-extras never says which", async ({ page, mocks }) => {
    await page.goto("/book?package=recovery-reset");
    const summary = page.getByTestId("package-summary");
    await expect(summary).toContainText("You'll choose Energy IV or Athlete Recovery IV on the secure booking page, subject to medical approval.");
    await expect(summary.getByTestId("split-online")).toHaveText("$180");
    await expect(summary.getByTestId("split-visit")).toHaveText("$29");
    await expect(page.locator("select, input[type=radio]")).toHaveCount(0);
    await expect(page.getByLabel(/Energy|Athlete/)).toHaveCount(0);

    await step1(page, "/book?package=recovery-reset");
    await page.getByRole("button", { name: "I've booked, confirm my package" }).click();
    await expect(page.getByTestId("addon-addon-compression-boots")).toHaveCount(0);
    // The package alone can be confirmed, without any enhancement.
    await page.getByRole("button", { name: "Pay at my visit" }).locator("visible=true").click();
    await page.getByTestId("at-visit-dialog").getByRole("button", { name: "Confirm my package" }).click();
    await expect(page.getByTestId("at-visit-dialog").getByRole("heading", { name: "You're all set." })).toBeVisible();
    const sent = mocks.netlify[0];
    expect(sent.get("package")).toBe("Recovery Reset");
    expect(sent.get("items")).toBe("Recovery Reset (package, at visit): Compression Boots: $29");
    expect(sent.get("dueAtVisit")).toBe("$29");
    expect([...sent.values()].join(" ")).not.toMatch(/Energy|Athlete/);
  });

  test("B12 packages show Booking opens soon and no booking form", async ({ page, mocks }) => {
    for (const slug of ["b12-and-light", "b12-and-restore"]) {
      await page.goto(`/book?package=${slug}`);
      const closed = page.getByTestId("booking-closed");
      await expect(closed).toContainText("Booking opens soon");
      await expect(closed).toContainText(MEDICAL_LINE);
      await expect(page.getByRole("button", { name: "Get my booking link" })).toHaveCount(0);
      await expect(page.locator("form")).toHaveCount(0);
    }
    expect(mocks.netlify).toHaveLength(0);
  });

  test("package pages pass axe (WCAG 2.2 AA)", async ({ page }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    for (const url of ["/book?package=hydrate-and-unwind", "/book/restorative?package=luna-light", "/book?package=b12-and-light"]) {
      await page.goto(url);
      await expect(page.getByText("Loading your booking options…")).toHaveCount(0);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.map((v) => `${url} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    }
  });
});
