// Restorative-only visits (red light, compression boots, aromatherapy; no IV or injection).
// Pure functions shared by the booking form (browser) and the checkout API (server), so the
// total a person sees and the amount Stripe charges come from the same code.
//
// No runtime imports on purpose: the unit tests (tests/unit) run this file directly with Node.

import type { AddOn, WellnessPackage } from "./types";

/**
 * BOOKING HOURS. Shary can change any of these numbers later; nothing else needs to change.
 * The form only offers times inside these rules, and the server checks them again on every
 * request, so they can't be bypassed. All times are Florida time (America/New_York), whatever
 * the visitor's own device or time zone says.
 * Days of the week aren't restricted yet (TODO (Shary): any days she doesn't work).
 */
export const BOOKING_HOURS = {
  /** Earliest appointment start, 24-hour "HH:mm" (10:00 = 10:00 AM). */
  firstStart: "10:00",
  /** Latest appointment start, 24-hour "HH:mm" (17:00 = 5:00 PM). */
  lastStart: "17:00",
  /** Gap between the start times the form offers, in minutes. */
  slotMinutes: 30,
  /** At least this many hours' notice. */
  minHoursAhead: 24,
  /** No more than this many days ahead. */
  maxDaysAhead: 90,
  /** Shary's time zone. Every date and time on the site is in this zone. */
  timeZone: "America/New_York",
} as const;

/**
 * The wire format for a preferred time: Florida wall-clock "YYYY-MM-DDTHH:mm". It is only ever
 * read as Florida time, so it can't shift with anyone's time zone. People never see it: every
 * place that shows a date uses formatPreferredTime / formatUsDate / formatClock below.
 */
const LOCAL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const minutesOf = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** Offset of BOOKING_HOURS.timeZone from UTC at an instant, in minutes (e.g. -240 in summer). */
let zoneFormat: Intl.DateTimeFormat | null = null;
function zoneOffsetMinutes(instant: Date): number {
  zoneFormat ??= new Intl.DateTimeFormat("en-US", {
    timeZone: BOOKING_HOURS.timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = zoneFormat.formatToParts(instant);
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

/** An instant as Florida wall-clock time, "YYYY-MM-DDTHH:mm". */
export function toFloridaTime(instant: Date): string {
  const local = new Date(instant.getTime() + zoneOffsetMinutes(instant) * 60_000);
  return local.toISOString().slice(0, 16);
}

/** "14:00" → "2:00 PM". Built by hand so it's always a plain space, never the browser's narrow one. */
export function formatClock(hhmm: string): string {
  const total = minutesOf(hhmm);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "2026-11-26" → "Thursday, November 26, 2026". A calendar date: no time zone is involved. */
export function formatUsDate(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return ymd;
  const [y, mo, d] = m.slice(1).map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  return `${weekday}, ${MONTHS[mo - 1]} ${d}, ${y}`;
}

/** "2030-05-04T10:00" → "Saturday, May 4, 2030 at 10:00 AM (Florida time)". */
export function formatPreferredTime(value: string): string {
  if (!LOCAL_TIME.test(value)) return value;
  return `${formatUsDate(value.slice(0, 10))} at ${formatClock(value.slice(11))} (Florida time)`;
}

const RULE_MESSAGES = {
  missing: "Please choose a date and time.",
  hours: `Please choose a time between ${formatClock(BOOKING_HOURS.firstStart)} and ${formatClock(BOOKING_HOURS.lastStart)}.`,
  past: `That date has already passed. Please choose a date at least ${BOOKING_HOURS.minHoursAhead} hours from now.`,
  soon: `Please choose a date at least ${BOOKING_HOURS.minHoursAhead} hours from now.`,
  far: `Please choose a date within the next ${BOOKING_HOURS.maxDaysAhead} days.`,
} as const;

/** Null when the preferred time is acceptable, otherwise the message to show. Used by browser and server. */
export function preferredTimeError(value: string, now = new Date()): string | null {
  const when = floridaTimeToDate(value);
  if (!when) return RULE_MESSAGES.missing;
  const hoursAhead = (when.getTime() - now.getTime()) / 3_600_000;
  if (hoursAhead < 0) return RULE_MESSAGES.past;
  const minute = minutesOf(value.slice(11));
  if (minute < minutesOf(BOOKING_HOURS.firstStart) || minute > minutesOf(BOOKING_HOURS.lastStart)) {
    return RULE_MESSAGES.hours;
  }
  if (hoursAhead < BOOKING_HOURS.minHoursAhead) return RULE_MESSAGES.soon;
  if (hoursAhead > BOOKING_HOURS.maxDaysAhead * 24) return RULE_MESSAGES.far;
  return null;
}

/** Every start time in the day, "10:00", "10:30", … "17:00". */
export function dailyStartTimes(): string[] {
  const out: string[] = [];
  for (let t = minutesOf(BOOKING_HOURS.firstStart); t <= minutesOf(BOOKING_HOURS.lastStart); t += BOOKING_HOURS.slotMinutes) {
    out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

export type BookableDay = { date: string; label: string; times: { value: string; label: string }[] };

/**
 * The dates and times the form offers right now: only ones that pass preferredTimeError, so a
 * person can't pick an invalid time. Days with no valid time left (e.g. tomorrow after 5 PM) are
 * left out.
 */
export function bookableDays(now = new Date()): BookableDay[] {
  const times = dailyStartTimes();
  const firstDay = toFloridaTime(now).slice(0, 10);
  const [y, mo, d] = firstDay.split("-").map(Number);
  const days: BookableDay[] = [];
  for (let i = 0; i <= BOOKING_HOURS.maxDaysAhead + 1; i++) {
    const date = new Date(Date.UTC(y, mo - 1, d + i)).toISOString().slice(0, 10);
    const ok = times.filter((t) => preferredTimeError(`${date}T${t}`, now) === null);
    if (ok.length) days.push({ date, label: formatUsDate(date), times: ok.map((t) => ({ value: t, label: formatClock(t) })) });
  }
  return days;
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
