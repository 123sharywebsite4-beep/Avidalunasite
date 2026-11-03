import { expect, expectMailchimpCall, test } from "./helpers";

// The contact form and the group-event request go to Netlify Forms (emailed to Shary).
// Ticking the email-list box also adds the person to Mailchimp; the message never goes there.

test.describe("contact form (Netlify form \"contact\")", () => {
  async function fill(page: import("@playwright/test").Page, { optIn }: { optIn: boolean }) {
    await page.goto("/contact");
    const form = page.getByRole("form", { name: "Contact form" });
    await form.getByLabel("Name", { exact: true }).fill("Ana Maria Rivera");
    await form.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await form.getByLabel("Phone").fill("941 555 0100");
    await form.getByLabel("Topic").selectOption("General question");
    await form.getByLabel("Your message").fill("Do you come to Bradenton on weekends?");
    if (optIn) await form.getByRole("checkbox").check();
    return form;
  }

  test("sends the same fields as before, url-encoded with form-name", async ({ page, mocks }) => {
    const form = await fill(page, { optIn: false });
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("contact-success")).toContainText("Your message is on its way to Shary.");
    expect(mocks.netlify).toHaveLength(1);
    expect(Object.fromEntries(mocks.netlify[0])).toEqual({
      "form-name": "contact",
      name: "Ana Maria Rivera",
      email: "ana@example.com",
      phone: "941 555 0100",
      topic: "General question",
      message: "Do you come to Bradenton on weekends?",
      optIn: "no",
      "bot-field": "",
    });
    await page.waitForTimeout(300);
    expect(mocks.mailchimp).toHaveLength(0);
  });

  test("the email-list box also adds them to Mailchimp with SOURCE=contact", async ({ page, mocks }) => {
    const form = await fill(page, { optIn: true });
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByTestId("contact-success")).toBeVisible();
    expect(mocks.netlify[0].get("optIn")).toBe("yes");
    await expect.poll(() => mocks.mailchimp.length).toBe(1);
    expectMailchimpCall(mocks.mailchimp[0], {
      EMAIL: "ana@example.com",
      FNAME: "Ana",
      LNAME: "Maria Rivera",
      SOURCE: "contact",
      OPTIN: "yes",
    });
  });

  test("client-side validation stops an empty form", async ({ page, mocks }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Please enter your name.")).toBeVisible();
    await expect(page.getByText("Please write a short message.")).toBeVisible();
    expect(mocks.netlify).toHaveLength(0);
  });

  test("shows the error message when Netlify fails, and skips Mailchimp", async ({ page, mocks }) => {
    mocks.netlifyFails = true;
    const form = await fill(page, { optIn: true });
    await form.getByRole("button", { name: "Send message" }).click();
    await expect(form.getByText(/Sorry, that didn't send\. Please email \S+@\S+ instead\./)).toBeVisible();
    await expect(page.getByTestId("contact-success")).toHaveCount(0);
    expect(mocks.mailchimp).toHaveLength(0);
  });
});

test.describe("group event request (Netlify form \"group-request\")", () => {
  async function fill(page: import("@playwright/test").Page, { optIn }: { optIn: boolean }) {
    await page.goto("/events");
    const form = page.getByRole("form", { name: "Group event request" });
    await form.getByLabel("Name", { exact: true }).fill("Ana Rivera");
    await form.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await form.getByLabel("Event date").fill("2030-05-04");
    await form.getByLabel("City").fill("Sarasota");
    await form.getByLabel("Approximate group size").selectOption("6 to 10");
    await form.getByLabel("Event type").selectOption("Birthday");
    await form.getByLabel("Anything else about your event?").fill("Afternoon, at a rental house.");
    if (optIn) await form.getByRole("checkbox").check();
    return form;
  }

  test("sends the request to Netlify only", async ({ page, mocks }) => {
    const form = await fill(page, { optIn: false });
    await form.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByTestId("group-success")).toContainText("Shary will reach out to plan your event.");
    expect(Object.fromEntries(mocks.netlify[0])).toEqual({
      "form-name": "group-request",
      name: "Ana Rivera",
      email: "ana@example.com",
      phone: "",
      eventDate: "2030-05-04",
      city: "Sarasota",
      groupSize: "6 to 10",
      eventType: "Birthday",
      note: "Afternoon, at a rental house.",
      optIn: "no",
      "bot-field": "",
    });
    await page.waitForTimeout(300);
    expect(mocks.mailchimp).toHaveLength(0);
  });

  test("the email-list box also adds them to Mailchimp with SOURCE=group", async ({ page, mocks }) => {
    const form = await fill(page, { optIn: true });
    await form.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByTestId("group-success")).toBeVisible();
    await expect.poll(() => mocks.mailchimp.length).toBe(1);
    expectMailchimpCall(mocks.mailchimp[0], { FNAME: "Ana", LNAME: "Rivera", SOURCE: "group", OPTIN: "yes" });
  });

  test("shows the error message when Netlify fails", async ({ page, mocks }) => {
    mocks.netlifyFails = true;
    const form = await fill(page, { optIn: false });
    await form.getByRole("button", { name: "Send request" }).click();
    await expect(form.getByText(/Sorry, that didn't send\. Please email \S+@\S+ instead\./)).toBeVisible();
  });
});

test("the static Netlify form definitions match what the site sends", async ({ request }) => {
  const res = await request.get("/__forms.html");
  expect(res.status()).toBe(200);
  expect(res.headers()["x-robots-tag"]).toBe("noindex");
  const html = await res.text();
  const fields = (form: string) => {
    const block = html.match(new RegExp(`<form name="${form}"[^>]*>([\\s\\S]*?)</form>`))?.[0] ?? "";
    expect(block).toContain('data-netlify="true"');
    expect(block).toContain('netlify-honeypot="bot-field"');
    return [...block.matchAll(/name="([^"]+)"/g)].map((m) => m[1]).filter((n) => n !== form).sort();
  };
  expect(fields("contact")).toEqual(
    ["bot-field", "email", "form-name", "message", "name", "optIn", "phone", "topic"],
  );
  expect(fields("group-request")).toEqual(
    ["bot-field", "city", "email", "eventDate", "eventType", "form-name", "groupSize", "name", "note", "optIn", "phone"],
  );
  expect(fields("add-ons-at-visit")).toEqual(["addOns", "bot-field", "email", "firstName", "form-name", "total"]);
  expect(fields("booking-extras")).toEqual(["bot-field", "dueAtVisit", "email", "form-name", "items", "name", "package"]);
  expect(fields("restorative-request")).toEqual(
    ["bot-field", "cityZip", "email", "enhancements", "firstName", "form-name", "lastName", "optIn", "phone",
      "preferred1", "preferred2", "preferred3", "selection", "total", "travelFee"],
  );
  expect(html).not.toMatch(/symptom|condition|medication|allerg|diagnos|pregnan/i);
});
