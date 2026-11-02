import { expect, expectMailchimpCall, expectNoPersonalDataInUrl, fillIntake, test } from "./helpers";

const HYDREIGHT = "https://booking.hydreight.com/widget-business/an92x";

test.describe("/book intake", () => {
  test("submits, shows the Hydreight button and adds them to Mailchimp (opted in)", async ({ page, mocks }) => {
    await page.goto("/book");
    await expect(page.getByLabel("Phone")).toHaveCount(0);
    await fillIntake(page, { optIn: true });
    await page.getByRole("button", { name: "Get my booking link" }).click();

    const button = page.getByTestId("hydreight-button");
    await expect(button).toBeVisible();
    await expect(button).toHaveAttribute("href", HYDREIGHT);
    await expect(button).toHaveAttribute("target", "_blank");
    await expect(button).toHaveAttribute("rel", /noopener/);
    await expect(page.getByRole("link", { name: "Open the secure booking page" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "You're in, Ana." })).toBeVisible();
    await expect(page.getByTestId("booked-button")).toBeVisible();

    await expect.poll(() => mocks.mailchimp.length).toBe(1);
    expectMailchimpCall(mocks.mailchimp[0], {
      EMAIL: "ana@example.com",
      FNAME: "Ana",
      LNAME: "Rivera",
      SOURCE: "booking",
      OPTIN: "yes",
    });
    expect(mocks.netlify).toHaveLength(0);

    expect(await page.evaluate(() => sessionStorage.getItem("avidaluna:email"))).toBe("ana@example.com");
    await expectNoPersonalDataInUrl(page);
  });

  test("everyone who asks for a booking link goes on the list, with OPTIN no if unticked", async ({ page, mocks }) => {
    await page.goto("/book");
    await fillIntake(page, { optIn: false });
    await page.getByRole("button", { name: "Get my booking link" }).click();
    await expect(page.getByTestId("hydreight-button")).toBeVisible();
    await expect.poll(() => mocks.mailchimp.length).toBe(1);
    expectMailchimpCall(mocks.mailchimp[0], { SOURCE: "booking", OPTIN: "no" });
  });

  test("still shows the Hydreight button when Mailchimp says no", async ({ page, mocks }) => {
    mocks.mailchimpReply = { result: "error", msg: "Too many subscribe attempts for this email address." };
    const warnings: string[] = [];
    page.on("console", (m) => m.type() === "warning" && warnings.push(m.text()));
    await page.goto("/book");
    await fillIntake(page, { optIn: true });
    await page.getByRole("button", { name: "Get my booking link" }).click();
    await expect(page.getByTestId("hydreight-button")).toBeVisible();
    await expect.poll(() => warnings.join()).toContain("[mailchimp] sign-up failed");
    expect(warnings.join()).not.toContain("ana@example.com");
  });

  test("still shows the Hydreight button when Mailchimp never answers", async ({ page, mocks }) => {
    mocks.mailchimpReply = "hang";
    await page.goto("/book");
    await fillIntake(page, { optIn: true });
    await page.getByRole("button", { name: "Get my booking link" }).click();
    await expect(page.getByTestId("hydreight-button")).toBeVisible();
    await expect(page.getByRole("heading", { name: "You're in, Ana." })).toBeVisible();
  });

  test("shows field errors and stays on the form when required fields are empty", async ({ page, mocks }) => {
    await page.goto("/book");
    await page.getByRole("button", { name: "Get my booking link" }).click();
    await expect(page.getByText("Please enter your name.").first()).toBeVisible();
    await expect(page.getByTestId("hydreight-button")).toHaveCount(0);
    expect(mocks.mailchimp).toHaveLength(0);
  });

  test("bots that fill the honeypot get no Mailchimp record", async ({ page, mocks }) => {
    await page.goto("/book");
    await fillIntake(page, { optIn: true });
    await page.locator('input[name="bot-field"]').fill("http://spam.example", { force: true });
    await page.getByRole("button", { name: "Get my booking link" }).click();
    await expect(page.getByTestId("hydreight-button")).toBeVisible();
    await page.waitForTimeout(500);
    expect(mocks.mailchimp).toHaveLength(0);
  });
});

test.describe("/join (Wellness Notes from a Nurse)", () => {
  test("site-styled form with the new copy, no phone and no Mailchimp UI", async ({ page }) => {
    await page.goto("/join");
    await expect(page.getByRole("heading", { level: 1, name: "Wellness Notes from a Nurse" })).toBeVisible();
    await expect(page.getByText(/one intentional choice at a time\. #LiveWellLonger/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Send me my free copy" })).toBeVisible();
    await expect(page.getByLabel("Phone")).toHaveCount(0);
    await expect(page.locator('form[action*="list-manage"], iframe, #mc_embed_signup')).toHaveCount(0);
  });

  test("requires the opt-in, then sends SOURCE=join and OPTIN=yes", async ({ page, mocks }) => {
    await page.goto("/join");
    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Last name").fill("Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByRole("button", { name: "Send me my free copy" }).click();
    await expect(page.getByText("Please check the box to join the list.")).toBeVisible();
    expect(mocks.mailchimp).toHaveLength(0);

    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send me my free copy" }).click();
    await expect(page.getByTestId("join-success")).toBeVisible();
    expect(mocks.mailchimp).toHaveLength(1);
    expectMailchimpCall(mocks.mailchimp[0], {
      EMAIL: "ana@example.com",
      FNAME: "Ana",
      LNAME: "Rivera",
      SOURCE: "join",
      OPTIN: "yes",
    });
  });

  test("someone already on the list counts as joined", async ({ page, mocks }) => {
    mocks.mailchimpReply = { result: "error", msg: "ana@example.com is already subscribed to list Avida Luna." };
    await page.goto("/join");
    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Last name").fill("Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send me my free copy" }).click();
    await expect(page.getByTestId("join-success")).toBeVisible();
  });

  test("shows a clear error when Mailchimp fails", async ({ page, mocks }) => {
    mocks.mailchimpReply = { result: "error", msg: "Something went wrong." };
    await page.goto("/join");
    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Last name").fill("Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Send me my free copy" }).click();
    await expect(page.getByText("We couldn't add you right now. Please try again in a moment.")).toBeVisible();
    await expect(page.getByTestId("join-success")).toHaveCount(0);
  });
});
