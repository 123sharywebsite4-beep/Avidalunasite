// Single source of truth for values that may change later.
// Sanity `siteSettings` overrides the contact values at runtime when it is configured.

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "YourRNShary@gmail.com";

export const HYDREIGHT_BOOKING_URL =
  process.env.HYDREIGHT_BOOKING_URL || "https://booking.hydreight.com/widget-business/an92x";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.avidaluna.com";

export const PHONE_DISPLAY = "(941) 348-6972";
export const PHONE_TEL = "tel:9413486972";

export const LEGAL_NAME = "Avida Luna LLC";
export const BRAND_NAME = "Avida Luna Wellness";
export const LEGAL_LINE = `${LEGAL_NAME}, doing business as ${BRAND_NAME}`;

/**
 * Shary's public Mailchimp signup form (no API key; these values are in her embed code).
 * The site posts to it in the background from its own forms. See src/lib/mailchimp-signup.ts.
 */
const MAILCHIMP_DC = process.env.NEXT_PUBLIC_MAILCHIMP_DC || "us22";
const MAILCHIMP_U = process.env.NEXT_PUBLIC_MAILCHIMP_U || "7887c318e6740cc303be74a3f";
const MAILCHIMP_ID = process.env.NEXT_PUBLIC_MAILCHIMP_ID || "485dcfa742";
export const MAILCHIMP = {
  origin: `https://avidaluna.${MAILCHIMP_DC}.list-manage.com`,
  u: MAILCHIMP_U,
  id: MAILCHIMP_ID,
  fId: process.env.NEXT_PUBLIC_MAILCHIMP_F_ID || "00a1c2e1f0",
  /** Mailchimp's own bot trap. Always sent, always empty. */
  honeypot: `b_${MAILCHIMP_U}_${MAILCHIMP_ID}`,
  /** Merge tags of the two text fields Shary adds to her audience. */
  sourceTag: process.env.NEXT_PUBLIC_MAILCHIMP_SOURCE_TAG || "SOURCE",
  optInTag: process.env.NEXT_PUBLIC_MAILCHIMP_OPTIN_TAG || "OPTIN",
};

export const NO_MEDICAL_INFO_NOTE = "Please don't include medical information here.";
