import { defineConfig, devices } from "@playwright/test";

// The tests build and start the site against a local mock of Stripe. Mailchimp and Netlify
// Forms are mocked in the browser (tests/helpers.ts). No real accounts or keys are needed. Set PW_CHROMIUM_PATH to use a pre-installed Chromium.
const PORT = 3200;
/** A second copy of the site built without Stripe keys: online payment off. */
const NO_PAYMENTS_PORT = 3201;
const MOCK = "http://localhost:3299";

export const testEnv = {
  NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
  STRIPE_SECRET_KEY: "sk_test_mock",
  STRIPE_API_BASE: MOCK,
  STRIPE_WEBHOOK_SECRET: "whsec_test_mock",
  HYDREIGHT_HOOK_SECRET: "test-hook-secret",
  // Shows the free-guide signup (off by default; Shary turns it on in Studio).
  LEAD_MAGNET_TEST_ENABLED: "1",
};

export default defineConfig({
  testDir: "./tests",
  // tests/unit runs with Node's own test runner (npm run test:unit), not Playwright.
  testIgnore: "unit/**",
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testMatch: /(checkout|a11y)\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "node tests/mock-server.mjs",
      url: `${MOCK}/__requests`,
      reuseExistingServer: false,
    },
    {
      command: `npm run build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}`,
      env: testEnv,
      timeout: 300_000,
      reuseExistingServer: false,
    },
    {
      // Same site, no Stripe keys, built into its own folder so its static pages say "pay at your visit".
      command: `npm run build && npx next start -p ${NO_PAYMENTS_PORT}`,
      url: `http://localhost:${NO_PAYMENTS_PORT}`,
      env: {
        NEXT_PUBLIC_SITE_URL: `http://localhost:${NO_PAYMENTS_PORT}`,
        HYDREIGHT_HOOK_SECRET: testEnv.HYDREIGHT_HOOK_SECRET,
        NEXT_DIST_DIR: ".next-no-payments",
      },
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
