import { test as base, expect, type Page, type APIRequestContext } from "@playwright/test";

export const MOCK = "http://localhost:3299";

/** The second test build, without Stripe keys (online payment off). Port: NO_PAYMENTS_PORT in playwright.config.ts. */
export const NO_PAYMENTS = "http://localhost:3201";

/** Shary's Mailchimp signup host (the default in src/lib/constants.ts). */
export const MAILCHIMP_HOST = "https://avidaluna.us22.list-manage.com";

export const PUBLIC_PAGES = [
  "/",
  "/services",
  "/packages",
  "/add-ons",
  "/events",
  "/wellness-education",
  "/wellness-education/understanding-iv-therapy",
  "/wellness-education/mobile-iv-hydration-for-busy-schedules",
  "/about",
  "/faq",
  "/contact",
  "/book",
  "/book/restorative",
  "/book/restorative/cancel",
  "/join",
  "/privacy",
  "/terms",
  "/add-ons/cancel",
  "/this-page-does-not-exist",
];

/**
 * What the browser sent to Mailchimp and Netlify Forms during one test. Both are mocked
 * with page routes, so no test ever reaches the real services.
 */
export type Mocks = {
  /** Query strings of Mailchimp subscribe/post-json calls. */
  mailchimp: URLSearchParams[];
  /** Bodies of Netlify Forms POSTs to /__forms.html. */
  netlify: URLSearchParams[];
  /** What Mailchimp answers: success, an error message, or no answer at all. */
  mailchimpReply: { result: "success" | "error"; msg: string } | "hang";
  netlifyFails: boolean;
};

export const test = base.extend<{ mocks: Mocks }>({
  mocks: [
    async ({ context }, use) => {
      const mocks: Mocks = {
        mailchimp: [],
        netlify: [],
        mailchimpReply: { result: "success", msg: "Thank you for subscribing!" },
        netlifyFails: false,
      };
      await context.route(`${MAILCHIMP_HOST}/**`, async (route) => {
        const url = new URL(route.request().url());
        mocks.mailchimp.push(url.searchParams);
        if (mocks.mailchimpReply === "hang") return; // never answers: the 8-second timeout applies
        const callback = url.searchParams.get("c") ?? "";
        await route.fulfill({
          contentType: "application/javascript",
          body: `${callback}(${JSON.stringify(mocks.mailchimpReply)})`,
        });
      });
      await context.route("**/__forms.html", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        mocks.netlify.push(new URLSearchParams(route.request().postData() ?? ""));
        await route.fulfill(mocks.netlifyFails ? { status: 500, body: "error" } : { status: 200, body: "ok" });
      });
      await use(mocks);
    },
    { auto: true },
  ],
});

export { expect };

/** The only fields the site may ever send to Mailchimp. */
export const MAILCHIMP_FIELDS = ["EMAIL", "FNAME", "LNAME", "OPTIN", "SOURCE"];

/** Checks one Mailchimp call: the right list, only the allowed fields, and the empty honeypot. */
export function expectMailchimpCall(params: URLSearchParams, expected: Record<string, string>) {
  expect(params.get("u")).toBe("7887c318e6740cc303be74a3f");
  expect(params.get("id")).toBe("485dcfa742");
  expect(params.get("f_id")).toBe("00a1c2e1f0");
  expect(params.get("b_7887c318e6740cc303be74a3f_485dcfa742")).toBe("");
  const fields = [...params.keys()].filter((k) => !["u", "id", "f_id", "c", "b_7887c318e6740cc303be74a3f_485dcfa742"].includes(k));
  expect(fields.sort()).toEqual(MAILCHIMP_FIELDS);
  for (const [k, v] of Object.entries(expected)) expect(params.get(k), k).toBe(v);
}

export async function resetMock(request: APIRequestContext) {
  await request.post(`${MOCK}/__control`, { data: { reset: true } });
}

export async function mockRequests(request: APIRequestContext) {
  const res = await request.get(`${MOCK}/__requests`);
  return (await res.json()) as { method: string; path: string; body: string; headers: Record<string, string> }[];
}

export async function fillIntake(page: Page, { optIn }: { optIn: boolean }) {
  await page.getByLabel("First name").fill("Ana");
  await page.getByLabel("Last name").fill("Rivera");
  await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
  if (optIn) await page.getByRole("checkbox").check();
}

export async function expectNoPersonalDataInUrl(page: Page) {
  expect(page.url()).not.toMatch(/ana|rivera|example\.com|%40/i);
}
