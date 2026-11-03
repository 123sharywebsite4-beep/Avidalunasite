import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * FUTURE AUTOMATION STUB (not built yet).
 *
 * Intended caller: a Make.com scenario that reads Hydreight's booking-confirmation email.
 * Intended payload:
 *   { "email": "client@example.com", "firstName": "Ana", "appointmentDate": "2026-11-20" }
 * Intended behavior: mark the client as booked in Shary's Mailchimp, which triggers the add-on
 * offer email. The site has no Mailchimp API key, so that step would need Shary to connect
 * Mailchimp in Make.com herself (or give the site an API key after all).
 * No health information is ever sent here.
 *
 * Auth: header `x-hook-secret` must equal HYDREIGHT_HOOK_SECRET.
 */
function authorized(req: Request): boolean {
  const expected = process.env.HYDREIGHT_HOOK_SECRET;
  const given = req.headers.get("x-hook-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ error: "Not implemented" }, { status: 501 });
}
