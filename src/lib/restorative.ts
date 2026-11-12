// Restorative-only visits (red light, compression boots, aromatherapy; no IV or injection).
// Pure functions shared by the booking form (browser) and the checkout API (server), so the
// total a person sees and the amount Stripe charges come from the same code.
//
// No runtime imports on purpose: the unit tests (tests/unit) run this file directly with Node.

import type { AddOn, WellnessPackage } from "./types";

/**
 * Which dates and times the booking form accepts. This is input checking, not a booking policy:
 * Shary can change these numbers. Times are entered and shown in Florida time.
 * TODO (Shary): confirm the earliest notice, the furthest date out, and any days or hours she doesn't work.
 */
export const BOOKING_DATE_RULES = {
  /** At least this many hours from now. */
  minHoursAhead: 24,
  /** No more than this many days from now. */
  maxDaysAhead: 90,
  /** Shary's time zone. Every time on the form is in this zone. */
  timeZone: "America/New_York",
} as const;

const LOCAL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Offset of BOOKING_DATE_RULES.timeZone from UTC at an instant, in minutes (e.g. -240 in summer). */
function zoneOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_DATE_RULES.timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"));
  return Math.round((asUtc - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000);
}

/** "2030-05-04T10:00" in Florida time → the instant it names. Null if it isn't a real date and time. */
export function floridaTimeToDate(value: string): Date | null {
  const m = LOCAL_TIME.exec(value);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const check = new Date(wall);
  if (check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d || h > 23 || mi > 59) return null;
  // Two passes so times next to a daylight-saving change land on the right offset.
  let instant = wall - zoneOffsetMinutes(new Date(wall)) * 60_000;
  instant = wall - zoneOffsetMinutes(new Date(instant)) * 60_000;
  return new Date(instant);
}

/** An instant as Florida wall-clock time, "YYYY-MM-DDTHH:mm" (the datetime-local format). */
export function toFloridaTime(instant: Date): string {
  const local = new Date(instant.getTime() + zoneOffsetMinutes(instant) * 60_000);
  return local.toISOString().slice(0, 16);
}

/** The earliest and latest values the date field accepts right now (for its min and max). */
export function bookingWindow(now = new Date()): { min: string; max: string } {
  const min = new Date(now.getTime() + BOOKING_DATE_RULES.minHoursAhead * 3_600_000);
  const max = new Date(now.getTime() + BOOKING_DATE_RULES.maxDaysAhead * 86_400_000);
  return { min: toFloridaTime(min), max: toFloridaTime(max) };
}

/** Null when the preferred time is acceptable, otherwise the message to show. */
export function preferredTimeError(value: string, now = new Date()): string | null {
  const when = floridaTimeToDate(value);
  if (!when) return "Please choose a date and time.";
  const hoursAhead = (when.getTime() - now.getTime()) / 3_600_000;
  if (hoursAhead < 0) return "That time has already passed. Please choose a later one.";
  if (hoursAhead < BOOKING_DATE_RULES.minHoursAhead) {
    return `Please choose a time at least ${BOOKING_DATE_RULES.minHoursAhead} hours from now.`;
  }
  if (hoursAhead > BOOKING_DATE_RULES.maxDaysAhead * 24) {
    return `Please choose a date within the next ${BOOKING_DATE_RULES.maxDaysAhead} days.`;
  }
  return null;
}

/** "2030-05-04T10:00" → "Saturday, May 4, 2030 at 10:00 AM (Florida time)". */
export function formatPreferredTime(value: string): string {
  const m = LOCAL_TIME.exec(value);
  if (!m) return value;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  // The digits already are Florida wall-clock time: format them as-is, in UTC, with no conversion.
  const wall = new Date(Date.UTC(y, mo - 1, d, h, mi));
  const date = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(wall);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(wall);
  return `${date} at ${time} (Florida time)`;
}

/** Short booking reference shown to the client and to Shary, and stored on the Stripe payment. */
export const REFERENCE_PATTERN = /^AL-[A-HJ-NP-Z2-9]{6}$/;

export function newReference(): string {
  // No 0/O or 1/I, so it reads cleanly over the phone.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  globalThis.crypto.getRandomValues(bytes);
  return `AL-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

/** One thing a person can book as the main part of a restorative visit. */
export type RestorativeChoice = {
  /** "package:luna-light" or "item:red-light". The only identifier the browser sends. */
  value: string;
  name: string;
  detail: string;
  /** Package price, or the service's standalone price. */
  price: number;
  /** Add-on ids already part of this choice (not offered again as enhancements). */
  includes: string[];
};

const enhancementPrice = (a: AddOn) => a.enhancementPrice ?? a.price;

/** Add-ons that can be booked: anything with an open TODO is a placeholder, never sold. */
export const bookableAddOns = (addOns: AddOn[]) => addOns.filter((a) => !a.todo);

/**
 * What can be booked as the main choice: restorative packages that are open for booking, then
 * single services and products at their standalone price.
 */
export function restorativeChoices(packages: WellnessPackage[], addOns: AddOn[]): RestorativeChoice[] {
  return [
    ...packages
      .filter((p) => p.type === "restorative" && p.bookingOpen)
      .map((p) => ({
        value: `package:${p.slug}`,
        name: p.name,
        detail: p.includes
          .filter((i) => i.kind === "restorative")
          .map((i) => (i.durationMinutes ? `${i.name}, ${i.durationMinutes} min` : i.name))
          .join(" + "),
        price: p.price,
        includes: p.includes.map((i) => i.id),
      })),
    ...bookableAddOns(addOns).map((a) => ({
      value: `item:${a.id.replace(/^addon-/, "")}`,
      name: a.name,
      detail:
        a.kind === "product" ? "Take-home product" : a.durationMinutes ? `${a.durationMinutes} minutes` : "Runs alongside your visit",
      price: a.price,
      includes: [a.id],
    })),
  ];
}

/** Enhancements on offer with a choice: bookable add-ons it doesn't already include. */
export function offeredEnhancements(choice: RestorativeChoice | null, addOns: AddOn[]): AddOn[] {
  return bookableAddOns(addOns).filter((a) => !choice?.includes.includes(a.id));
}

export type PricedLine = {
  id: string;
  name: string;
  description: string;
  unitAmountCents: number;
  quantity: number;
};

export type RestorativeQuote = {
  main: RestorativeChoice;
  extras: { addOn: AddOn; price: number }[];
  travelFee: number;
  total: number;
  totalCents: number;
  /** Line items for Stripe: the main choice, each enhancement, and the travel fee. */
  lines: PricedLine[];
};

export type QuoteProblem = "unknown-choice" | "unavailable-extra" | "invalid-price";

const validPrice = (n: number, max: number) => Number.isFinite(n) && n >= 0 && n <= max;
const cents = (dollars: number) => Math.round(dollars * 100);

/**
 * Prices a restorative visit from ids only: the main choice at its own price, each enhancement at
 * its enhancement price, plus the travel fee once. Anything unknown, hidden, closed for booking or
 * already included is refused, never silently dropped, so the charge always matches the screen.
 */
export function quoteRestorative(
  input: { selection: string; extras: string[] },
  catalog: { packages: WellnessPackage[]; addOns: AddOn[]; travelFee: number },
): { ok: true; quote: RestorativeQuote } | { ok: false; problem: QuoteProblem } {
  const main = restorativeChoices(catalog.packages, catalog.addOns).find((c) => c.value === input.selection);
  if (!main) return { ok: false, problem: "unknown-choice" };

  const offered = offeredEnhancements(main, catalog.addOns);
  const extras: RestorativeQuote["extras"] = [];
  for (const id of new Set(input.extras)) {
    const addOn = offered.find((a) => a.id === id);
    if (!addOn) return { ok: false, problem: "unavailable-extra" };
    extras.push({ addOn, price: enhancementPrice(addOn) });
  }

  const travelFee = catalog.travelFee;
  if (!validPrice(main.price, 1000) || main.price < 1 || !validPrice(travelFee, 200)) {
    return { ok: false, problem: "invalid-price" };
  }
  if (extras.some((e) => !validPrice(e.price, 1000) || e.price < 1)) return { ok: false, problem: "invalid-price" };

  const lines: PricedLine[] = [
    { id: main.value, name: main.name, description: main.detail, unitAmountCents: cents(main.price), quantity: 1 },
    ...extras.map((e) => ({
      id: e.addOn.id,
      name: `${e.addOn.name} (enhancement)`,
      description: e.addOn.description,
      unitAmountCents: cents(e.price),
      quantity: 1,
    })),
    ...(travelFee > 0
      ? [{ id: "travel-fee", name: "Travel fee", description: "Once per appointment", unitAmountCents: cents(travelFee), quantity: 1 }]
      : []),
  ];
  const totalCents = lines.reduce((sum, l) => sum + l.unitAmountCents * l.quantity, 0);
  return {
    ok: true,
    quote: { main, extras, travelFee, total: totalCents / 100, totalCents, lines },
  };
}
