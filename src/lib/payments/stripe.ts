import "server-only";
import Stripe from "stripe";
import type { PaidSummary, PaymentProvider } from "./types";

let client: Stripe | null = null;

export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!client) {
    // STRIPE_API_BASE is for automated tests only (points the SDK at a local mock).
    const base = process.env.STRIPE_API_BASE ? new URL(process.env.STRIPE_API_BASE) : null;
    client = new Stripe(key, {
      maxNetworkRetries: 1,
      telemetry: false,
      ...(base
        ? {
            host: base.hostname,
            port: base.port,
            protocol: base.protocol.replace(":", "") as "http" | "https",
          }
        : {}),
    });
  }
  return client;
}

/** Checkout links expire after this long (Stripe's minimum is 30 minutes). */
const SESSION_MINUTES = 45;

export const stripeProvider: PaymentProvider = {
  async createCheckout(lines, { email, successUrl, cancelUrl, metadata, askAppointmentDate, reference, description }) {
    const stripe = stripeClient();
    if (!stripe) throw new Error("Stripe is not configured");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lines.map((l) => ({
        quantity: l.quantity,
        price_data: {
          currency: "usd",
          unit_amount: l.unitAmountCents,
          product_data: { name: l.name, description: l.description || undefined },
        },
      })),
      ...(email ? { customer_email: email } : {}),
      ...(askAppointmentDate
        ? {
            custom_fields: [
              {
                key: "appointmentdate",
                // Free text on Stripe's page, so the label spells out the US format (no 11/12 ambiguity).
                label: { type: "custom" as const, custom: "Appointment date (MM/DD/YYYY)" },
                type: "text" as const,
                optional: false,
              },
            ],
          }
        : {}),
      // Ids, quantities, the date and the reference, so the webhook and Shary can match the
      // payment to the booking. No names, phone numbers or addresses.
      metadata,
      ...(reference
        ? {
            client_reference_id: reference,
            expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
            payment_intent_data: { description, metadata },
          }
        : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    if (!session.url) throw new Error("Stripe returned no checkout URL");
    return { id: session.id, url: session.url };
  },

  async getPaidSummary(sessionId) {
    const stripe = stripeClient();
    if (!stripe) return null;
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items"] });
      const summary: PaidSummary = {
        paid: session.payment_status === "paid",
        items: (session.line_items?.data ?? []).map((li) => ({
          name: li.description ?? "Wellness add-on",
          quantity: li.quantity ?? 1,
          amountCents: li.amount_total,
        })),
        totalCents: session.amount_total ?? 0,
        kind: session.metadata?.kind ?? null,
        reference: session.metadata?.reference ?? null,
        preferredTime: session.metadata?.preferredTime ?? null,
      };
      return summary;
    } catch (error) {
      console.error("[stripe] retrieve failed:", (error as Error).message);
      return null;
    }
  },
};
