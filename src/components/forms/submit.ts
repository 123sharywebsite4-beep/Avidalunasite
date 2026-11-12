export type SubmitResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

export async function postJson(url: string, body: unknown): Promise<SubmitResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as SubmitResult | null;
    if (data && typeof data.ok === "boolean") return data;
    return { ok: false, error: "Something went wrong. Please try again." };
  } catch {
    return { ok: false, error: "We couldn't reach the server. Check your connection and try again." };
  }
}

/**
 * The static copy of the site's Netlify forms (public/__forms.html). Netlify registers the
 * forms from it at deploy time, and submissions must be POSTed to this file: posting to a
 * page route would hit Next.js instead of Netlify's form handler.
 */
export const NETLIFY_FORMS_PATH = "/__forms.html";

/** Netlify's honeypot (netlify-honeypot="bot-field"). Hidden from people; bots fill it. */
export const HONEYPOT = "bot-field";

/** Sends one submission to Netlify Forms, which emails it to Shary. True when Netlify accepted it. */
export async function submitNetlifyForm(formName: string, fields: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch(NETLIFY_FORMS_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": formName, ...fields }).toString(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Splits "Ana Maria Rivera" into Mailchimp's FNAME ("Ana") and LNAME ("Maria Rivera"). */
export function splitName(full: string) {
  const [firstName = "", ...rest] = full.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

export function readForm(form: HTMLFormElement) {
  const fd = new FormData(form);
  const str = (k: string) => String(fd.get(k) ?? "").trim();
  const bool = (k: string) => fd.get(k) === "on";
  return { str, bool };
}

/** Keys for sessionStorage. Never put personal data in URLs. */
export const STORAGE = {
  email: "avidaluna:email",
  firstName: "avidaluna:firstName",
  lastName: "avidaluna:lastName",
  /** The package being booked on /book (slug), so a refresh restores the right flow. */
  packageSlug: "avidaluna:package",
  selection: "avidaluna:addons",
  /** Booking step to restore on refresh: "book" (step 2) or "addons" (step 3). */
  step: "avidaluna:step",
  /** Set when "Book now" was clicked, so coming back to the tab opens step 3. */
  bookClicked: "avidaluna:bookClicked",
  /** Restorative booking in progress (sent to Stripe), so the cancel page can restore the form. */
  restorativeDraft: "avidaluna:restorative",
} as const;

/** sessionStorage reads and writes that never throw (private mode, blocked storage). */
export const session = {
  get(key: string): string | null {
    try {
      return safeSession()?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  remove(key: string) {
    try {
      safeSession()?.removeItem(key);
    } catch {
      // Blocked storage: nothing was saved.
    }
  },
  set(key: string, value: string) {
    try {
      safeSession()?.setItem(key, value);
    } catch {
      // Storage full or blocked: the in-memory state still works for this visit.
    }
  },
};

export function safeSession() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
