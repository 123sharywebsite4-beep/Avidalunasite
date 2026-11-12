import "server-only";
import { getAddOnsForCheckout, getRestorativeCatalogLive } from "../content";
import { enhancementPrice } from "../packages";
import { formatPreferredTime, newReference, quoteRestorative } from "../restorative";
import { MAX_ADDON_QUANTITY, type RestorativeCheckoutInput } from "../validation";
import { stripeClient, stripeProvider } from "./stripe";
import type { CheckoutSession, PaymentProvider, PricedLine } from "./types";

export type { PaidSummary } from "./types";

/** Swap this to change processors. Everything else talks to the interface. */
const provider: PaymentProvider = stripeProvider;

export const paymentsEnabled = () => stripeClient() !== null;

export class CheckoutError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * Prices the requested add-ons from Sanity (live read). Prices come only from the server,
 * so the price shown and the price charged always match.
 */
export async function priceAddOns(items: { id: string; quantity: number }[]): Promise<PricedLine[]> {
  const wanted = new Map<string, number>();
  for (const { id, quantity } of items) {
    if (quantity > 0) wanted.set(id, Math.min(MAX_ADDON_QUANTITY, (wanted.get(id) ?? 0) + quantity));
  }
  if (wanted.size === 0) throw new CheckoutError("Please choose at least one add-on.", 400);

  const addOns = await getAddOnsForCheckout([...wanted.keys()]);
  if (addOns.length !== wanted.size) {
    throw new CheckoutError("Some of these add-ons are no longer available. Please refresh the page.", 409);
  }

  // Add-ons are bought for an appointment already booked, so they're charged at the enhancement price.
  return addOns.map((a) => {
    const price = enhancementPrice(a);
    if (!Number.isFinite(price) || price < 1 || price > 1000) {
      throw new CheckoutError("One of these add-ons has no valid price yet.", 409);
    }
    return {
      id: a.id,
      name: a.name,
      description: a.description,
      unitAmountCents: Math.round(price * 100),
      quantity: wanted.get(a.id)!,
    };
  });
}

/** Prices the add-ons on the server and opens a hosted checkout. */
export async function createAddOnCheckout(
  items: { id: string; quantity: number }[],
  email: string | undefined,
  opts: { successUrl: string; cancelUrl: string },
): Promise<CheckoutSession> {
  const lines = await priceAddOns(items);
  return provider.createCheckout(lines, {
    email: email || undefined,
    ...opts,
    // Only ids and quantities, so the webhook can log what was bought. No personal data.
    metadata: { addons: lines.map((l) => `${l.id}x${l.quantity}`).join(",").slice(0, 500) },
    askAppointmentDate: true,
  });
}

const QUOTE_ERRORS = {
  "unknown-choice": "This package or service isn't available to book right now. Please refresh the page and choose again.",
  "unavailable-extra": "One of these enhancements is no longer available. Please refresh the page.",
  "invalid-price": "One of these has no valid price yet. Please call or text Shary to book.",
} as const;

/**
 * Restorative visit: prices the choice, enhancements and travel fee from Sanity (live read) and
 * opens a hosted checkout tagged with the booking reference. Returns 409 if anything is no longer
 * bookable or the total differs from the one the person saw.
 */
export async function createRestorativeCheckout(
  input: RestorativeCheckoutInput,
  opts: { successUrl: string; cancelUrl: string },
): Promise<{ url: string; reference: string; totalCents: number }> {
  const result = quoteRestorative(input, await getRestorativeCatalogLive());
  if (!result.ok) throw new CheckoutError(QUOTE_ERRORS[result.problem], 409);
  const { quote } = result;
  if (quote.totalCents !== input.shownTotalCents) {
    throw new CheckoutError("Prices have changed since this page loaded. Please refresh the page to see the current total.", 409);
  }
  const reference = input.reference ?? newReference();
  const session = await provider.createCheckout(quote.lines, {
    email: input.email,
    successUrl: opts.successUrl,
    cancelUrl: opts.cancelUrl,
    reference,
    description: `Restorative visit ${reference}: ${quote.main.name}, ${formatPreferredTime(input.preferredTime)}`.slice(0, 400),
    metadata: {
      kind: "restorative",
      reference,
      selection: input.selection,
      extras: quote.extras.map((e) => e.addOn.id).join(",").slice(0, 500),
      // Machine-readable (Florida wall-clock, never converted) and the same time in words, US style.
      preferredTime: input.preferredTime,
      preferredTimeFlorida: formatPreferredTime(input.preferredTime),
    },
  });
  return { url: session.url, reference, totalCents: quote.totalCents };
}

export function getPaidSummary(sessionId: string) {
  return provider.getPaidSummary(sessionId);
}
