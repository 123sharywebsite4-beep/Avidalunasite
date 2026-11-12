/** A line already priced by the server from Sanity. The browser never supplies a price. */
export type PricedLine = {
  id: string;
  name: string;
  description: string;
  unitAmountCents: number;
  quantity: number;
};

export type CheckoutSession = { id: string; url: string };

/** What the success pages show, read back from the processor (never from the URL). */
export type PaidSummary = {
  paid: boolean;
  items: { name: string; quantity: number; amountCents: number }[];
  totalCents: number;
  /** "restorative" for a restorative visit; absent for add-ons. */
  kind: string | null;
  /** Restorative visits: the booking reference (AL-XXXXXX) and preferred time ("YYYY-MM-DDTHH:mm"). */
  reference: string | null;
  preferredTime: string | null;
};

export type CheckoutOptions = {
  email?: string;
  successUrl: string;
  cancelUrl: string;
  /** Ids only (no personal data). Shown on the payment in Stripe and passed to the webhook. */
  metadata: Record<string, string>;
  /** Add-ons: ask for the appointment date on the checkout page. */
  askAppointmentDate?: boolean;
  /** Restorative visits: the booking reference, shown on the payment and in the Stripe dashboard. */
  reference?: string;
  /** Short text on the payment in Stripe, e.g. "Restorative visit AL-7K3QPX". */
  description?: string;
};

/**
 * Anything that can take a card payment for the site. Stripe today; Square (or another
 * processor) can implement this if Stripe doesn't approve her account.
 */
export interface PaymentProvider {
  createCheckout(lines: PricedLine[], opts: CheckoutOptions): Promise<CheckoutSession>;
  getPaidSummary(sessionId: string): Promise<PaidSummary | null>;
}

/** Old name, kept so existing imports read naturally. */
export type AddOnPaymentProvider = PaymentProvider;
