import type { NextRequest } from "next/server";
import { fail, ok, readJson } from "@/lib/api";
import { CheckoutError, createAddOnCheckout, paymentsEnabled } from "@/lib/payments";
import { isRateLimited } from "@/lib/spam";
import { checkoutSchema } from "@/lib/validation";

// Add-on checkout. The browser sends only [{ id, quantity }] (and optionally the email
// from the booking step). Prices are looked up live on the server.
export async function POST(req: NextRequest) {
  if (isRateLimited(req, "checkout", 20)) return fail(429, "Too many tries. Please wait a few minutes.");
  if (!paymentsEnabled()) {
    return fail(503, "Online payment is coming soon. Add your add-ons at your visit.");
  }
  const parsed = checkoutSchema.safeParse(await readJson(req));
  if (!parsed.success) return fail(400, "Something's off with your selection. Please try again.");

  const origin = req.nextUrl.origin;
  try {
    const session = await createAddOnCheckout(parsed.data.items, parsed.data.email || undefined, {
      successUrl: `${origin}/add-ons/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/add-ons/cancel`,
    });
    return ok({ url: session.url });
  } catch (error) {
    if (error instanceof CheckoutError) return fail(error.status, error.message);
    console.error("[checkout] failed:", (error as Error).message);
    return fail(502, "We couldn't start checkout. Please try again, or pay at your visit.");
  }
}
