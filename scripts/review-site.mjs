// Capture the real production build with repository-provided local service mocks.
// Run after `PW_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e` has built the site.
import { chromium } from "@playwright/test";
import { testEnv } from "../playwright.config.ts";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, openSync } from "node:fs";
const out = "/workspace/design-review/site";
mkdirSync(out, { recursive: true });
const env = { ...process.env, ...testEnv };
const mock = spawn(process.execPath, ["tests/mock-server.mjs"], {
  env,
  stdio: ["ignore", openSync("/tmp/avidaluna-review-mock.log", "w"), "inherit"],
});
const app = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3200"],
  {
    env,
    stdio: [
      "ignore",
      openSync("/tmp/avidaluna-review-app.log", "w"),
      "inherit",
    ],
  },
);
const routes = [
  ["home", "/"],
  ["services", "/services"],
  ["about", "/about"],
  ["groups", "/events"],
  ["faq", "/faq"],
  ["contact", "/contact"],
  ["booking", "/book"],
  ["join", "/join"],
  ["add-ons", "/add-ons"],
  ["resources", "/wellness-education"],
  ["article", "/wellness-education/understanding-iv-therapy"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["not-found", "/page-not-found"],
];
const pages = new Map();
const issues = [];
let browser;
async function capture(page, name, device) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `${out}/${name}-${device}-full.png`,
    fullPage: true,
  });
  await page.screenshot({ path: `${out}/${name}-${device}.png` });
  if (
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  )
    issues.push(`${device} ${name}: horizontal overflow`);
  const entry = pages.get(name) || {};
  entry[device] = `${name}-${device}.png`;
  pages.set(name, entry);
}
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://localhost:3200")).ok) break;
    } catch {}
    if (i === 99) throw Error("Application startup failed");
    await new Promise((r) => setTimeout(r, 300));
  }
  browser = await chromium.launch({
    executablePath: process.env.PW_CHROMIUM_PATH || "/usr/bin/chromium",
  });
  for (const [device, width, height] of [
    ["desktop", 1440, 1000],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    // Never reach the real Mailchimp or Netlify Forms from a review run.
    await context.route("https://*.list-manage.com/**", (route) => {
      const c = new URL(route.request().url()).searchParams.get("c");
      return route.fulfill({ contentType: "application/javascript", body: `${c}({"result":"success","msg":"ok"})` });
    });
    await context.route("**/__forms.html", (route) =>
      route.request().method() === "POST" ? route.fulfill({ status: 200, body: "ok" }) : route.continue(),
    );
    page.on("pageerror", (e) => issues.push(`${device}: ${e.message}`));
    for (const [name, path] of routes) {
      await page.goto("http://localhost:3200" + path, {
        waitUntil: "networkidle",
      });
      await capture(page, name, device);
    }
    await page.goto("http://localhost:3200/book");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await capture(page, "booking-validation", device);
    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Last name").fill("Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.waitForTimeout(2700);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByTestId("book-success").waitFor();
    await capture(page, "booking-handoff", device);
    await page.goto("http://localhost:3200/join");
    await page.getByLabel("First name").fill("Ana");
    await page.getByLabel("Last name").fill("Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByRole("checkbox").check();
    await page.waitForTimeout(2700);
    await page.getByRole("button", { name: "Send me my free copy" }).click();
    await page.getByTestId("join-success").waitFor();
    await capture(page, "join-success", device);
    await page.goto("http://localhost:3200/add-ons");
    await page
      .getByRole("button", { name: "Add one Red Light Therapy", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Add one Aromatherapy", exact: true })
      .click();
    await capture(page, "add-ons-selected", device);
    await page.goto("http://localhost:3200/add-ons/cancel");
    await capture(page, "checkout-cancelled", device);
    await page
      .getByRole("button", { name: "Pay now", exact: true })
      .locator("visible=true")
      .click();
    await page.waitForURL(/\/add-ons\/success/);
    await page.getByRole("heading", { name: "You're all set." }).waitFor();
    await capture(page, "checkout-paid", device);
    await page.goto(
      "http://localhost:3200/add-ons/success?session_id=not-a-session",
    );
    await capture(page, "checkout-unconfirmed", device);
    await page.goto("http://localhost:3200/contact");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page.locator(".field-error").first().waitFor();
    await capture(page, "contact-validation", device);
    await page.getByLabel("Name", { exact: true }).fill("Ana Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByLabel("Topic", { exact: false }).selectOption({ index: 1 });
    await page
      .getByLabel("Your message", { exact: false })
      .fill("Please let me know about appointment locations.");
    await page.waitForTimeout(2700);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page.getByTestId("contact-success").waitFor();
    await capture(page, "contact-success", device);
    await page.goto("http://localhost:3200/contact");
    await page.getByLabel("Name", { exact: true }).fill("Ana Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByLabel("Topic", { exact: false }).selectOption({ index: 1 });
    await page
      .getByLabel("Your message", { exact: false })
      .fill("Please let me know about appointment locations.");
    await page.route("**/__forms.html", (route) => route.fulfill({ status: 500, body: "error" }));
    await page.waitForTimeout(2700);
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page.getByRole("alert").waitFor();
    await capture(page, "contact-error-simulated", device);
    await page.unroute("**/__forms.html");
    await page.goto("http://localhost:3200/events#request");
    await page
      .getByRole("button", { name: "Send request", exact: true })
      .click();
    await capture(page, "group-validation", device);
    await page.getByLabel("Name", { exact: true }).fill("Ana Rivera");
    await page.getByLabel("Email", { exact: true }).fill("ana@example.com");
    await page.getByLabel("Event date").fill("2027-01-20");
    await page.getByLabel("City", { exact: false }).fill("Lakewood Ranch");
    await page.getByLabel("Approximate group size").selectOption({ index: 1 });
    await page.getByLabel("Event type").selectOption({ index: 1 });
    await page.waitForTimeout(2700);
    await page
      .getByRole("button", { name: "Send request", exact: true })
      .click();
    await page.getByTestId("group-success").waitFor();
    await capture(page, "group-success", device);
    await context.close();
  }
  const data = [...pages].map(([name, shots]) => ({
    name,
    ...Object.fromEntries(
      Object.entries(shots).map(([key, file]) => [
        key,
        `data:image/png;base64,${readFileSync(`${out}/${file}`).toString("base64")}`,
      ]),
    ),
  }));
  const title = (name) =>
    name.replaceAll("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const galleryData = data.map((page) => ({
    ...page,
    ...Object.fromEntries(
      ["desktop", "mobile"].map((device) => [
        device,
        `data:image/png;base64,${readFileSync(`${out}/${page.name}-${device}-full.png`).toString("base64")}`,
      ]),
    ),
  }));
  const gallery = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Avida Luna — Site review</title><style>body{margin:0;background:#e9eade;color:#29372d;font:16px Arial}header{padding:28px 4vw;background:#f7f4ed;position:sticky;top:0;border-bottom:1px solid #bcc6b3}h1{font-size:24px;margin:0 0 14px}select{padding:10px;font-size:16px;width:300px}p{font-size:13px}.pair{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:25px;padding:30px 4vw}.pair img{width:100%;box-shadow:0 1px 10px #29372d22}h2{font-size:14px;font-weight:400}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><header><h1>Avida Luna Wellness · Design review</h1><select id="select">${data.map((v, i) => `<option value="${i}">${title(v.name)}</option>`).join("")}</select><p>Desktop and mobile screenshots of the production build. Payment and email examples use local mocks; “contact error simulated” uses a simulated service failure. Supplied prices and copy still need owner review.</p></header><main class="pair"><section><h2>Desktop</h2><img id="desktop" alt="Desktop screenshot"></section><section><h2>Mobile</h2><img id="mobile" alt="Mobile screenshot"></section></main><script>const data=${JSON.stringify(galleryData)};function show(){const p=data[Number(document.getElementById('select').value)];document.getElementById('desktop').src=p.desktop;document.getElementById('mobile').src=p.mobile}document.getElementById('select').addEventListener('change',show);show()</script></html>`;
  writeFileSync(`${out}/review.html`, gallery);
  const pdf = await browser.newPage();
  await pdf.setContent(
    `<html><style>@page{size:A4 landscape;margin:12mm}body{font:12px Arial;color:#29372d}.sheet{break-after:page}.pair{display:flex;gap:20px;align-items:start}.desktop{width:650px}.mobile{width:190px}h1{font-size:22px}p{font-size:10px}</style><body>${data.map((v) => `<section class="sheet"><h1>Avida Luna / ${title(v.name)}</h1><p>Desktop and mobile · Production build with local mock services. Prices and clinical copy pending owner review.</p><div class="pair"><img class="desktop" src="${v.desktop}"><img class="mobile" src="${v.mobile}"></div></section>`).join("")}</body></html>`,
  );
  await pdf.pdf({
    path: `${out}/avida-luna-review.pdf`,
    printBackground: true,
  });
  writeFileSync(
    `${out}/checks.json`,
    JSON.stringify({ pages: [...pages.keys()], issues }, null, 2),
  );
  console.log(JSON.stringify({ captured: pages.size, viewports: 2, issues }));
} finally {
  if (browser) await browser.close();
  app.kill("SIGTERM");
  mock.kill("SIGTERM");
}
