import { MAILCHIMP } from "./constants";

// Adds someone to Shary's Mailchimp list through her public signup form (no API key).
// Runs in the browser: Mailchimp's form endpoint doesn't allow cross-site fetch, so this
// uses its JSONP variant (subscribe/post-json). Only these fields are ever sent:
// EMAIL, FNAME, LNAME, SOURCE and OPTIN. Never anything about health.

/** Where the sign-up came from. Shary's Mailchimp automations key off this. */
export type ListSource = "booking" | "join" | `join:${string}` | "contact" | "group" | "restorative" | "lead-magnet";

export type ListSignup = {
  email: string;
  firstName: string;
  lastName: string;
  source: ListSource;
  /** Ticked the email-list box. Sent as OPTIN "yes" or "no". */
  optIn: boolean;
};

const TIMEOUT_MS = 8000;
let calls = 0;

/** Mailchimp answers with { result: "success" | "error", msg }. */
type Reply = { result?: string; msg?: string };

/**
 * Resolves true once Mailchimp accepts the address (or already has it), false on any
 * failure or after 8 seconds. Never throws. Failures are logged without personal data.
 */
export function addToList(signup: ListSignup): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const callback = `avidalunaList${Date.now()}_${calls++}`;
    const params = new URLSearchParams({
      u: MAILCHIMP.u,
      id: MAILCHIMP.id,
      f_id: MAILCHIMP.fId,
      EMAIL: signup.email,
      FNAME: signup.firstName,
      LNAME: signup.lastName,
      [MAILCHIMP.sourceTag]: signup.source,
      [MAILCHIMP.optInTag]: signup.optIn ? "yes" : "no",
      [MAILCHIMP.honeypot]: "",
      c: callback,
    });

    const w = window as unknown as Record<string, unknown>;
    const script = document.createElement("script");
    let settled = false;
    const finish = (ok: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // A reply that arrives after the timeout must not throw, so leave a no-op behind.
      w[callback] = () => {};
      script.remove();
      if (!ok) console.warn("[mailchimp] sign-up failed:", reason);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false, "timed out"), TIMEOUT_MS);

    w[callback] = (reply: Reply) => {
      const msg = String(reply?.msg ?? "");
      // Someone already on the list is a success: they're on it.
      const ok = reply?.result === "success" || /already subscribed/i.test(msg);
      finish(ok, msg.replace(/\S+@\S+/g, "<email>").slice(0, 200));
    };
    script.onerror = () => finish(false, "network error");
    script.src = `${MAILCHIMP.origin}/subscribe/post-json?${params}`;
    document.head.appendChild(script);
  });
}
