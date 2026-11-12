// Unit tests for the restorative pricing and date rules (src/lib/restorative.ts).
// Run: npm run test:unit   (Node's built-in test runner; no browser or build needed)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bookingWindow,
  floridaTimeToDate,
  formatPreferredTime,
  newReference,
  preferredTimeError,
  quoteRestorative,
  REFERENCE_PATTERN,
  restorativeChoices,
  toFloridaTime,
} from "../../src/lib/restorative.ts";
import type { AddOn, WellnessPackage } from "../../src/lib/types.ts";

const addOn = (id: string, price: number, enhancementPrice: number | null, extra: Partial<AddOn> = {}): AddOn => ({
  id,
  name: id.replace("addon-", ""),
  description: "",
  durationMinutes: null,
  price,
  enhancementPrice,
  kind: "service",
  image: null,
  ...extra,
});

const ADD_ONS: AddOn[] = [
  addOn("addon-red-light", 29, 25),
  addOn("addon-compression-boots", 39, 35),
  addOn("addon-aromatherapy", 20, 15),
  addOn("addon-placeholder", 50, 40, { todo: "Photo and price from Shary." }),
];

const item = (a: AddOn) => ({ id: a.id, name: a.name, kind: "restorative" as const, price: a.price, durationMinutes: null });
const pkg = (slug: string, price: number, includes: string[], extra: Partial<WellnessPackage> = {}): WellnessPackage => ({
  id: `package-${slug}`,
  slug,
  name: slug,
  type: "restorative",
  includes: includes.map((id) => item(ADD_ONS.find((a) => a.id === id)!)),
  ivChoices: [],
  price,
  bookingOpen: true,
  ...extra,
});

const PACKAGES = [
  pkg("luna-light", 45, ["addon-red-light", "addon-aromatherapy"]),
  pkg("luna-closed", 55, ["addon-red-light"], { bookingOpen: false }),
  pkg("hydrate", 139, ["addon-red-light"], { type: "iv" }),
];
const catalog = { packages: PACKAGES, addOns: ADD_ONS, travelFee: 8 };

describe("quoteRestorative", () => {
  it("prices a package, enhancements at the enhancement price, and the travel fee once", () => {
    const r = quoteRestorative({ selection: "package:luna-light", extras: ["addon-compression-boots"] }, catalog);
    assert.ok(r.ok);
    assert.equal(r.quote.totalCents, 4500 + 3500 + 800);
    assert.deepEqual(
      r.quote.lines.map((l) => [l.name, l.unitAmountCents]),
      [
        ["luna-light", 4500],
        ["compression-boots (enhancement)", 3500],
        ["Travel fee", 800],
      ],
    );
  });

  it("prices a single service at its standalone price", () => {
    const r = quoteRestorative({ selection: "item:red-light", extras: ["addon-aromatherapy"] }, catalog);
    assert.ok(r.ok);
    assert.equal(r.quote.total, 29 + 15 + 8);
  });

  it("counts a repeated enhancement once", () => {
    const r = quoteRestorative({ selection: "item:red-light", extras: ["addon-aromatherapy", "addon-aromatherapy"] }, catalog);
    assert.ok(r.ok);
    assert.equal(r.quote.extras.length, 1);
  });

  it("refuses a closed package, an IV package and an unknown choice", () => {
    for (const selection of ["package:luna-closed", "package:hydrate", "package:nope", "item:nope"]) {
      assert.deepEqual(quoteRestorative({ selection, extras: [] }, catalog), { ok: false, problem: "unknown-choice" }, selection);
    }
  });

  it("refuses an add-on with an open TODO, as the main choice or as an enhancement", () => {
    assert.deepEqual(quoteRestorative({ selection: "item:placeholder", extras: [] }, catalog), {
      ok: false,
      problem: "unknown-choice",
    });
    assert.deepEqual(quoteRestorative({ selection: "package:luna-light", extras: ["addon-placeholder"] }, catalog), {
      ok: false,
      problem: "unavailable-extra",
    });
    assert.ok(!restorativeChoices(PACKAGES, ADD_ONS).some((c) => c.value === "item:placeholder"));
  });

  it("refuses an enhancement the package already includes", () => {
    assert.deepEqual(quoteRestorative({ selection: "package:luna-light", extras: ["addon-red-light"] }, catalog), {
      ok: false,
      problem: "unavailable-extra",
    });
  });

  it("refuses a missing or broken price instead of charging it", () => {
    const broken = { ...catalog, packages: [pkg("luna-light", Number.NaN, [])] };
    assert.deepEqual(quoteRestorative({ selection: "package:luna-light", extras: [] }, broken), {
      ok: false,
      problem: "invalid-price",
    });
  });

  it("leaves out the travel fee line when the fee is zero", () => {
    const r = quoteRestorative({ selection: "item:red-light", extras: [] }, { ...catalog, travelFee: 0 });
    assert.ok(r.ok);
    assert.equal(r.quote.lines.length, 1);
  });
});

describe("dates (Florida time)", () => {
  const now = new Date("2026-11-12T15:00:00Z"); // 10:00 AM in Florida (EST, UTC-5)

  it("converts Florida wall-clock time, across daylight saving", () => {
    assert.equal(floridaTimeToDate("2026-11-13T10:00")?.toISOString(), "2026-11-13T15:00:00.000Z");
    assert.equal(floridaTimeToDate("2026-07-04T10:00")?.toISOString(), "2026-07-04T14:00:00.000Z");
    assert.equal(toFloridaTime(new Date("2026-07-04T14:00:00Z")), "2026-07-04T10:00");
    assert.equal(floridaTimeToDate("2026-02-30T10:00"), null);
    assert.equal(floridaTimeToDate("tomorrow"), null);
  });

  it("needs at least 24 hours' notice and no more than 90 days", () => {
    assert.match(preferredTimeError("2026-11-12T09:00", now)!, /already passed/);
    assert.match(preferredTimeError("2026-11-13T09:59", now)!, /at least 24 hours/);
    assert.equal(preferredTimeError("2026-11-13T10:00", now), null);
    assert.equal(preferredTimeError("2027-02-10T10:00", now), null);
    assert.match(preferredTimeError("2027-02-11T10:01", now)!, /within the next 90 days/);
    assert.equal(preferredTimeError("", now), "Please choose a date and time.");
  });

  it("gives the date field matching limits", () => {
    assert.deepEqual(bookingWindow(now), { min: "2026-11-13T10:00", max: "2027-02-10T10:00" });
  });

  it("formats the time for Shary and the client", () => {
    assert.equal(formatPreferredTime("2030-05-04T14:30"), "Saturday, May 4, 2030 at 2:30 PM (Florida time)");
  });
});

describe("booking reference", () => {
  it("is AL- and six unambiguous characters", () => {
    for (let i = 0; i < 50; i++) assert.match(newReference(), REFERENCE_PATTERN);
  });
});
