// Unit tests for the restorative pricing and date rules (src/lib/restorative.ts).
// Run: npm run test:unit   (Node's built-in test runner; no browser or build needed)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BOOKING_HOURS,
  bookableDays,
  floridaTimeToDate,
  formatClock,
  formatPreferredTime,
  formatUsDate,
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

  // The exact wording from the brief: plain and specific, never "invalid date".
  const HOURS = "Please choose a time between 10:00 AM and 5:00 PM.";
  const SOON = "Please choose a date at least 24 hours from now.";

  it("keeps the rules in one place, at the agreed values", () => {
    assert.deepEqual(
      { ...BOOKING_HOURS },
      { firstStart: "10:00", lastStart: "17:00", slotMinutes: 30, minHoursAhead: 24, maxDaysAhead: 90, timeZone: "America/New_York" },
    );
  });

  it("refuses a date in the past", () => {
    assert.equal(
      preferredTimeError("2026-11-11T14:00", now),
      "That date has already passed. Please choose a date at least 24 hours from now.",
    );
  });

  it("refuses a time less than 24 hours away", () => {
    assert.equal(preferredTimeError("2026-11-12T16:00", now), SOON);
    // 10:00 AM tomorrow, a minute short of 24 hours.
    assert.equal(preferredTimeError("2026-11-13T10:00", new Date("2026-11-12T15:01:00Z")), SOON);
  });

  it("refuses a date more than 90 days out", () => {
    assert.equal(preferredTimeError("2027-02-10T10:00", now), null);
    assert.equal(preferredTimeError("2027-02-11T10:00", now), "Please choose a date within the next 90 days.");
  });

  it("refuses times before 10 AM and after 5 PM (the 12:46 AM booking)", () => {
    assert.equal(preferredTimeError("2026-11-20T00:46", now), HOURS);
    assert.equal(preferredTimeError("2026-11-20T09:59", now), HOURS);
    assert.equal(preferredTimeError("2026-11-20T17:01", now), HOURS);
    assert.equal(preferredTimeError("2026-11-20T21:00", now), HOURS);
  });

  it("accepts a valid booking, including exactly 10:00 AM and 5:00 PM", () => {
    assert.equal(preferredTimeError("2026-11-13T10:00", now), null);
    assert.equal(preferredTimeError("2026-11-26T14:00", now), null);
    assert.equal(preferredTimeError("2026-11-26T17:00", now), null);
    // Summer (EDT) works the same in Florida wall-clock terms.
    assert.equal(preferredTimeError("2027-03-20T10:00", new Date("2027-03-01T15:00:00Z")), null);
  });

  it("refuses a missing or impossible date", () => {
    assert.equal(preferredTimeError("", now), "Please choose a date and time.");
    assert.equal(preferredTimeError("2026-11-31T10:00", now), "Please choose a date and time.");
  });

  it("only offers times that pass the rules", () => {
    const days = bookableDays(now);
    // Tomorrow from 10:00 AM (exactly 24 hours), through day 90.
    assert.equal(days[0].date, "2026-11-13");
    assert.equal(days[0].times[0].label, "10:00 AM");
    assert.equal(days.at(-1)!.date, "2027-02-10");
    assert.deepEqual(days.at(-1)!.times.map((t) => t.label), ["10:00 AM"]);
    assert.equal(days[1].label, "Saturday, November 14, 2026");
    assert.deepEqual(
      days[1].times.map((t) => t.label),
      ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM"],
    );
    for (const d of days) for (const t of d.times) assert.equal(preferredTimeError(`${d.date}T${t.value}`, now), null);
    // After 5 PM Florida time, tomorrow has nothing left 24 hours out, so it isn't offered.
    assert.equal(bookableDays(new Date("2026-11-12T22:30:00Z"))[0].date, "2026-11-14");
  });

  it("works out 'now' in Florida, not the device's time zone", () => {
    // 11:30 PM Nov 12 in Florida is already Nov 13 in UTC (and in Europe): the first day is still Nov 13 + 24h.
    const lateNight = new Date("2026-11-13T04:30:00Z");
    assert.equal(bookableDays(lateNight)[0].date, "2026-11-14");
  });

  it("formats dates and times US style, with no time zone shift", () => {
    assert.equal(formatPreferredTime("2026-11-26T14:00"), "Thursday, November 26, 2026 at 2:00 PM (Florida time)");
    assert.equal(formatPreferredTime("2030-05-04T10:00"), "Saturday, May 4, 2030 at 10:00 AM (Florida time)");
    assert.equal(formatUsDate("2026-12-05"), "Saturday, December 5, 2026");
    assert.equal(formatClock("12:00"), "12:00 PM");
    assert.equal(formatClock("00:46"), "12:46 AM");
    // Plain spaces only (browsers put a narrow no-break space before AM/PM).
    assert.doesNotMatch(formatPreferredTime("2026-11-26T14:00"), /[\u202f\u00a0]/);
  });
});

describe("booking reference", () => {
  it("is AL- and six unambiguous characters", () => {
    for (let i = 0; i < 50; i++) assert.match(newReference(), REFERENCE_PATTERN);
  });
});
