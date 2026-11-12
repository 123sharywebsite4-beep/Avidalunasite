import { z } from "zod";
import { preferredTimeError, REFERENCE_PATTERN } from "./restorative";

// Form schemas, checked in the browser before anything is sent (Netlify Forms, Mailchimp)
// and, for checkout, again on the server. None of these accept health information: there
// is no health field, and free-text boxes carry "Please don't include medical information here."

const name = z.string().trim().min(1, "Please enter your name.").max(60, "That's a bit long.");
const email = z.string().trim().toLowerCase().email("Please enter a valid email address.").max(254);
const phone = z
  .string()
  .trim()
  .max(25)
  .refine((v) => v === "" || /^[+\d][\d\s().-]{6,}$/.test(v), "Please enter a valid phone number.")
  .optional()
  .default("");
const shortText = (max: number) => z.string().trim().max(max, `Please keep this under ${max} characters.`);

export const intakeSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  optIn: z.boolean().default(false),
});
export type IntakeInput = z.infer<typeof intakeSchema>;

export const joinSchema = intakeSchema.extend({
  optIn: z.literal(true, { error: "Please check the box to join the list." }),
  eventSlug: z
    .string()
    .trim()
    .max(96)
    .regex(/^[a-z0-9-]*$/)
    .optional()
    .default(""),
});
export type JoinInput = z.infer<typeof joinSchema>;

/** Free-guide signup (LeadMagnetForm): name and email only. */
export const leadMagnetSchema = intakeSchema.pick({ firstName: true, lastName: true, email: true });

export const contactTopics = ["General question", "Group event", "Partnership", "Other"] as const;

export const contactSchema = z.object({
  name,
  email,
  phone,
  topic: z.enum(contactTopics, { error: "Please choose a topic." }),
  message: shortText(1000).min(1, "Please write a short message."),
  optIn: z.boolean().default(false),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const groupSizes = ["2 to 5", "6 to 10", "11 to 20", "21 or more"] as const;
export const eventTypes = [
  "Birthday",
  "Bridal party or girls' trip",
  "Brunch or private gathering",
  "Office or team wellness",
  "Pop-up at a business",
  "Other",
] as const;

export const groupRequestSchema = z.object({
  name,
  email,
  phone,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please choose a date."),
  city: shortText(80).min(1, "Please enter the city."),
  groupSize: z.enum(groupSizes, { error: "Please choose a group size." }),
  eventType: z.enum(eventTypes, { error: "Please choose an event type." }),
  note: shortText(1000).optional().default(""),
  optIn: z.boolean().default(false),
});
export type GroupRequestInput = z.infer<typeof groupRequestSchema>;

export const MAX_ADDON_QUANTITY = 10;

/** The browser sends only ids and quantities. Any price field is stripped and ignored. */
export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        quantity: z.number().int().min(0).max(MAX_ADDON_QUANTITY),
      }),
    )
    .max(20),
  email: z.string().trim().toLowerCase().email().max(254).optional().or(z.literal("")),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** "Pay at my visit": the add-ons plus who to bring them for. No prices, no health details. */
export const atVisitSchema = z.object({
  items: checkoutSchema.shape.items,
  firstName: name,
  email,
});
export type AtVisitInput = z.infer<typeof atVisitSchema>;

/** "Pay at my visit" from /book step 3: also the last name, for the "booking-extras" email to Shary. */
export const bookingExtrasSchema = atVisitSchema.extend({ lastName: name });

/** One preferred date and time, in Florida time, inside BOOKING_DATE_RULES. Checked when parsed. */
const preferredTime = z
  .string()
  .trim()
  .superRefine((value, ctx) => {
    const problem = preferredTimeError(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const restorativeSelection = z
  .string()
  .trim()
  .regex(/^(package|item):[a-z0-9-]{1,96}$/, "Please choose a package or service.");

const restorativeExtras = z.array(z.string().trim().min(1).max(100)).max(10);

/**
 * Restorative-only visit (no IV or injection, so no Hydreight): contact details, where, what,
 * and one preferred date and time. No health fields.
 */
export const restorativeRequestSchema = z.object({
  firstName: name,
  lastName: name,
  email,
  phone: z
    .string()
    .trim()
    .max(25)
    .refine((v) => /^[+\d][\d\s().-]{6,}$/.test(v), "Please enter a valid phone number."),
  cityZip: shortText(80).min(2, "Please enter your city or ZIP code."),
  selection: restorativeSelection,
  extras: restorativeExtras,
  preferredTime,
  optIn: z.boolean().default(false),
});
export type RestorativeRequestInput = z.infer<typeof restorativeRequestSchema>;

/**
 * What the browser sends to /api/restorative-checkout: ids, the date, the email for the Stripe
 * receipt, and the booking reference. Never a price: `shownTotalCents` is only compared with the
 * server's own total, so a price change since the page loaded returns 409 instead of a surprise.
 * Name, phone and address are not sent: they go to Shary through Netlify Forms only.
 */
export const restorativeCheckoutSchema = z.object({
  selection: restorativeSelection,
  extras: restorativeExtras,
  preferredTime,
  email,
  reference: z.string().regex(REFERENCE_PATTERN).optional(),
  shownTotalCents: z.number().int().min(0).max(1_000_000),
});
export type RestorativeCheckoutInput = z.infer<typeof restorativeCheckoutSchema>;

/** Field errors keyed by field name, first message only. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
