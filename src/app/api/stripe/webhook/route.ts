import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/payments/stripe";

// Stripe webhook: confirms payments. Logs only ids, the booking reference and the amount.
// metadata.kind says what was paid for: "restorative" (a restorative visit), or none (add-ons).
// Shary's payment emails come from Stripe itself (turn on in Stripe settings).
export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!stripe || !secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const body = await req.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.metadata?.kind === "restorative") {
      // Shary matches this reference to the "restorative-request" form email she already has.
      console.info("[stripe] restorative visit paid", {
        reference: session.metadata.reference ?? session.client_reference_id ?? "",
        session: session.id,
        selection: session.metadata.selection ?? "",
        extras: session.metadata.extras ?? "",
        preferredTime: session.metadata.preferredTime ?? "",
        amount: session.amount_total,
        paid: session.payment_status,
      });
    } else {
      console.info("[stripe] add-on payment completed", {
        session: session.id,
        items: session.metadata?.addons ?? "",
        amount: session.amount_total,
        paid: session.payment_status,
      });
    }
  }

  return NextResponse.json({ received: true });
}
