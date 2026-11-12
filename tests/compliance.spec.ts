import { ALLOWED_SERVICE_NAMES, COMPLIANCE_WORDS, findComplianceWord } from "../studio/lib/compliance";
import { expect, PUBLIC_PAGES, test } from "./helpers";

test.describe("health wording", () => {
  for (const path of PUBLIC_PAGES) {
    test(`no banned words on ${path}`, async ({ page }) => {
      await page.goto(path);
      // Open every accordion so hidden answers are scanned too.
      await page.$$eval("details", (els) => els.forEach((d) => d.setAttribute("open", "")));
      const text = await page.locator("body").innerText();
      const title = await page.title();
      const meta = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      for (const chunk of [text, title, meta]) {
        const found = findComplianceWord(chunk);
        expect(found, `"${found}" found on ${path}`).toBeNull();
      }
    });
  }

  test("only Shary's two approved service names are allowed; the words stay banned elsewhere", () => {
    expect([...ALLOWED_SERVICE_NAMES]).toEqual(["Detox/Hangover IV", "Migraine IV"]);
    expect(findComplianceWord("Detox/Hangover IV is $190. Migraine IV is $190.")).toBeNull();
    for (const text of ["A gentle detox", "Hangover help", "migraine iv", "Migraine relief", "Detox IV", "Hangover IV"]) {
      expect(findComplianceWord(text), text).not.toBeNull();
    }
    expect(findComplianceWord("Migraine IV to treat you")).toBe("treat");
  });

  test("the word list covers the brief's banned words", () => {
    for (const w of ["cure", "treat", "heal", "prevent", "detox", "detoxification", "immunity", "migraine",
      "inflammation", "blood pressure", "anxiety", "disease", "guaranteed"]) {
      expect(COMPLIANCE_WORDS).toContain(w);
    }
  });
});

test.describe("forms collect no health information", () => {
  const formPages = ["/book", "/book/restorative", "/join", "/contact", "/events"];
  for (const path of formPages) {
    test(`${path}: every text box has the no-medical-info line and no health fields exist`, async ({ page }) => {
      await page.goto(path);
      const names = await page.$$eval("input, select, textarea", (els) =>
        els.map((e) => `${e.getAttribute("name") ?? ""} ${e.id}`),
      );
      const labels = await page.$$eval("label", (els) => els.map((l) => l.textContent ?? ""));
      for (const s of [...names, ...labels]) {
        expect(s).not.toMatch(/symptom|condition|medication|allerg|health|diagnos|pregnan|medical history/i);
      }
      const forms = page.locator("form");
      const count = await forms.count();
      expect(count).toBeGreaterThan(0);
      for (let i = 0; i < count; i++) {
        await expect(forms.nth(i)).toContainText("Please don't include medical information here.");
      }
    });
  }
});

test.describe("redirects", () => {
  const map: Record<string, string> = {
    "/about-me": "/about",
    "/cart": "/add-ons",
    "/wellnesseducation": "/wellness-education",
    "/faq-1": "/faq",
    "/home": "/",
    "/welcome": "/",
  };
  for (const [from, to] of Object.entries(map)) {
    test(`${from} -> ${to} (301)`, async ({ request }) => {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status()).toBe(301);
      expect(new URL(res.headers()["location"], "http://x").pathname).toBe(to);
    });
  }
});

test.describe("SEO and privacy basics", () => {
  test("private routes are noindex", async ({ page, request }) => {
    await page.goto("/add-ons/cancel");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    const api = await request.post("/api/checkout", { data: {} });
    expect(api.headers()["x-robots-tag"]).toBe("noindex");
  });

  test("every page has a unique title and a canonical URL", async ({ page }) => {
    const titles = new Set<string>();
    for (const path of ["/", "/services", "/packages", "/add-ons", "/events", "/about", "/faq", "/contact", "/book", "/book/restorative"]) {
      await page.goto(path);
      const title = await page.title();
      expect(titles.has(title), `duplicate title ${title}`).toBe(false);
      titles.add(title);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    }
  });

  test("structured data is present on Home, Services and FAQ", async ({ page }) => {
    await page.goto("/");
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.join()).toContain('"MedicalBusiness"');
    expect(ld.join()).toContain('"knowsLanguage":["en","es"]');
    expect(ld.join()).not.toContain("streetAddress");
    await page.goto("/faq");
    expect((await page.locator('script[type="application/ld+json"]').allTextContents()).join()).toContain("FAQPage");
    await page.goto("/services");
    const services = (await page.locator('script[type="application/ld+json"]').allTextContents()).join();
    expect(services).toContain("FAQPage");
    expect(services).toContain("OfferCatalog");
  });

  test("titles fit in 60 characters and descriptions in 160", async ({ page }) => {
    for (const path of ["/", "/services", "/packages", "/add-ons", "/events", "/wellness-education", "/about", "/faq", "/contact", "/book", "/book/restorative", "/join"]) {
      await page.goto(path);
      expect((await page.title()).length, `title on ${path}`).toBeLessThanOrEqual(60);
      const meta = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
      expect(meta.length, `description on ${path}`).toBeLessThanOrEqual(160);
    }
  });

  test("llms.txt is plain text with the services and no flagged words", async ({ request }) => {
    const res = await request.get("/llms.txt");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    const body = await res.text();
    expect(body).toMatch(/^# Avida Luna Wellness/);
    expect(body).toContain("## IV drips");
    expect(findComplianceWord(body)).toBeNull();
  });

  test("no third-party scripts or requests", async ({ page }) => {
    const external: string[] = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) external.push(r.url());
    });
    for (const path of ["/", "/services", "/add-ons", "/book"]) await page.goto(path, { waitUntil: "networkidle" });
    expect(external).toEqual([]);
  });

  test("security headers are set", async ({ request }) => {
    const h = (await request.get("/")).headers();
    expect(h["content-security-policy"]).toContain("default-src 'self'");
    // Mailchimp's JSONP reply is the only outside script allowed, and nothing else changed.
    const csp = Object.fromEntries(
      h["content-security-policy"].split(";").map((d) => {
        const [name, ...values] = d.trim().split(/\s+/);
        return [name, values.join(" ")];
      }),
    );
    expect(csp["script-src"]).toBe("'self' 'unsafe-inline' https://avidaluna.us22.list-manage.com");
    expect(csp["connect-src"]).toBe("'self'");
    expect(csp["form-action"]).toBe("'self' https://checkout.stripe.com");
    expect(csp["frame-src"]).toBe("'none'");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("sticky mobile bar shows on content pages and hides on /book and /add-ons", async ({ page }) => {
    const barLink = page.locator(".fixed.inset-x-0.bottom-0").getByRole("link", { name: "Book an appointment" });
    await page.goto("/services");
    await expect(barLink).toBeVisible();
    await page.goto("/book");
    await expect(barLink).toHaveCount(0);
    await page.goto("/add-ons");
    await expect(barLink).toHaveCount(0);
  });
});
