import "server-only";
import Stripe from "stripe";
import type { AddOnPaymentProvider, PaidSummary } from "./types";

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

export const stripeProvider: AddOnPaymentProvider = {
  async createCheckout(lines, { email, successUrl, cancelUrl }) {
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
      custom_fields: [
        {
          key: "appointmentdate",
          label: { type: "custom", custom: "Appointment date" },
          type: "text",
          optional: false,
        },
      ],
      // Only ids and quantities, so the webhook can log what was bought. No personal data.
      metadata: {
        addons: lines.map((l) => `${l.id}x${l.quantity}`).join(",").slice(0, 500),
      },
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
      };
      return summary;
    } catch (error) {
      console.error("[stripe] retrieve failed:", (error as Error).message);
      return null;
    }
  },
};
