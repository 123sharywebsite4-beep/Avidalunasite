// Package and restorative pricing. Pure functions, used by server pages and client forms,
// so the numbers shown on cards, in booking and in the emails to Shary always agree.
//
// Rules from Shary: one-time bookings only (no memberships, recurring billing or prepaid series).
// IVs and IM injections are booked, screened and paid on Hydreight. Restorative-only visits are paid
// online when booked (/book/restorative) once Stripe is on, otherwise at the visit. Enhancements to an
// IV visit are paid at the visit (or online on /add-ons).

import type { AddOn, PackageItem, PackageType, Service, WellnessPackage } from "./types";

export const MEDICAL_CONSULTATION_LINE =
  "Required medical consultation included. IVs and injections are subject to medical clearance and provider approval.";

export const IV_TRAVEL_NOTE = "Additional travel charges may apply and will be confirmed before booking.";

export const PACKAGE_GROUPS: { type: PackageType; id: string; eyebrow: string }[] = [
  { type: "restorative", id: "restorative", eyebrow: "No IV needed" },
  { type: "iv", id: "iv-wellness", eyebrow: "IV + restorative" },
  { type: "injection", id: "b12-wellness", eyebrow: "B12 + restorative" },
];

/** Raw package as stored (fallback file or Sanity): item ids instead of items. */
export type PackageSource = {
  id: string;
  slug: string;
  name: string;
  type: PackageType;
  includes: string[];
  ivChoices?: string[];
  price: number;
  bookingOpen: boolean;
};

export function serviceItem(s: Pick<Service, "id" | "name" | "price">): PackageItem {
  return { id: s.id, name: s.name, kind: "medical", price: s.price, durationMinutes: null };
}

export function addOnItem(a: Pick<AddOn, "id" | "name" | "price" | "durationMinutes">): PackageItem {
  return { id: a.id, name: a.name, kind: "restorative", price: a.price, durationMinutes: a.durationMinutes };
}

/** Resolves item ids against the current services and add-ons. Unknown ids are dropped. */
export function resolvePackages(sources: PackageSource[], services: Service[], addOns: AddOn[]): WellnessPackage[] {
  const items = new Map<string, PackageItem>([
    ...services.map((s) => [s.id, serviceItem(s)] as const),
    ...addOns.map((a) => [a.id, addOnItem(a)] as const),
  ]);
  const pick = (ids: string[] = []) => ids.map((id) => items.get(id)).filter((i): i is PackageItem => Boolean(i));
  return sources.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    type: p.type,
    includes: pick(p.includes),
    ivChoices: pick(p.ivChoices).filter((i) => i.kind === "medical"),
    price: p.price,
    bookingOpen: p.bookingOpen,
  }));
}

export const isMedical = (pkg: WellnessPackage) => pkg.type !== "restorative";

/** Booking is open unless the package is switched off, or it's an injection package (travel pending). */
export const canBook = (pkg: WellnessPackage) => pkg.bookingOpen;

/**
 * The part paid on Hydreight: the included IV / IM injection's price. With an IV choice
 * (Recovery Reset), the choices' price; if they ever differ, the lowest, shown as "from".
 */
export function medicalPart(pkg: WellnessPackage): { amount: number; varies: boolean } {
  if (!isMedical(pkg)) return { amount: 0, varies: false };
  const fixed = pkg.includes.filter((i) => i.kind === "medical").reduce((sum, i) => sum + (i.price ?? 0), 0);
  const choices = pkg.ivChoices.map((c) => c.price ?? 0);
  const choice = choices.length ? Math.min(...choices) : 0;
  return { amount: fixed + choice, varies: new Set(choices).size > 1 };
}

/** The part paid at the visit: package price minus the Hydreight part (never below zero). */
export function atVisitPart(pkg: WellnessPackage): number {
  return Math.max(0, pkg.price - medicalPart(pkg).amount);
}

/** The IV or injection a package books on Hydreight, as words: "Energy IV or Athlete Recovery IV". */
export function medicalLabel(pkg: WellnessPackage): string {
  const fixed = pkg.includes.filter((i) => i.kind === "medical").map((i) => i.name);
  const choice = pkg.ivChoices.length ? [pkg.ivChoices.map((c) => c.name).join(" or ")] : [];
  return [...fixed, ...choice].join(" + ");
}

export const restorativeItems = (pkg: WellnessPackage) => pkg.includes.filter((i) => i.kind === "restorative");

/** What a package card lists, in order: the IV (or IV choice) first, then restorative items. */
export function includedLines(pkg: WellnessPackage): string[] {
  const medical = medicalLabel(pkg);
  return [
    ...(medical ? [medical] : []),
    ...restorativeItems(pkg).map((i) => (i.durationMinutes ? `${i.name}, ${i.durationMinutes} minutes` : i.name)),
  ];
}

/** Enhancement price: the lower price when added to an existing appointment or package. */
export const enhancementPrice = (a: AddOn) => a.enhancementPrice ?? a.price;

/** Enhancements on offer: only what isn't already included in the selected package. */
export function availableEnhancements(addOns: AddOn[], pkg?: WellnessPackage | null): AddOn[] {
  const included = new Set(pkg?.includes.map((i) => i.id) ?? []);
  return addOns.filter((a) => !a.todo && !included.has(a.id));
}

// Restorative-only visit pricing lives in ./restorative.ts (shared by the form and the checkout API).
