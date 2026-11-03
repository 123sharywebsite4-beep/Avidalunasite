/** A line already priced by the server from Sanity. The browser never supplies a price. */
export type PricedLine = {
  id: string;
  name: string;
  description: string;
  unitAmountCents: number;
  quantity: number;
};

export type CheckoutSession = { id: string; url: string };

export type PaidSummary = {
  paid: boolean;
  items: { name: string; quantity: number; amountCents: number }[];
  totalCents: number;
};

/**
 * Anything that can sell add-ons. Stripe today; Square (or another processor)
 * can implement this if Stripe doesn't approve her account.
 */
export interface AddOnPaymentProvider {
  createCheckout(
    lines: PricedLine[],
    opts: { email?: string; successUrl: string; cancelUrl: string },
  ): Promise<CheckoutSession>;
  getPaidSummary(sessionId: string): Promise<PaidSummary | null>;
}
