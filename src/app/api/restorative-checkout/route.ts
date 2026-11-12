import type { NextRequest } from "next/server";
import { fail, ok, readJson } from "@/lib/api";
import { CheckoutError, createRestorativeCheckout, paymentsEnabled } from "@/lib/payments";
import { isRateLimited } from "@/lib/spam";
import { fieldErrors, restorativeCheckoutSchema } from "@/lib/validation";

// Restorative visit checkout. The browser sends ids, the preferred time, the email for the
// receipt and the total it showed (compared, never charged). Prices are read live on the server.
// The booking details themselves go to Shary through Netlify Forms, before the redirect to Stripe.
export async function POST(req: NextRequest) {
  if (isRateLimited(req, "restorative-checkout", 20)) return fail(429, "Too many tries. Please wait a few minutes.");
  if (!paymentsEnabled()) {
    return fail(503, "Online payment isn't available right now. You can send your request and pay at your visit.");
  }
  const parsed = restorativeCheckoutSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    return fail(400, "Something's off with your booking. Please check the form and try again.", fieldErrors(parsed.error));
  }

  const origin = req.nextUrl.origin;
  try {
    const session = await createRestorativeCheckout(parsed.data, {
      successUrl: `${origin}/book/restorative/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/book/restorative/cancel`,
    });
    return ok(session);
  } catch (error) {
    if (error instanceof CheckoutError) return fail(error.status, error.message);
    console.error("[restorative-checkout] failed:", (error as Error).message);
    return fail(502, "We couldn't start checkout. Please try again, or call or text Shary.");
  }
}
