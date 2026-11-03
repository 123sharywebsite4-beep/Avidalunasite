// Default text for the Terms of use and Privacy notice pages, as Sanity rich text.
//
// Used two ways, so the wording only lives here:
//   1. The website shows it when the page hasn't been published in Sanity yet.
//   2. The Studio pre-fills the "Legal pages" documents with it the first time Shary opens them.
//
// No imports on purpose: both the Next.js site and the Sanity Studio load this file.

export type LegalPageKey = "terms" | "privacy";

export type LegalSpan = { _type: "span"; _key: string; text: string; marks: string[] };
export type LegalBlock = {
  _type: "block";
  _key: string;
  style: "normal" | "h2" | "h3";
  listItem?: "bullet" | "number";
  level?: number;
  markDefs: { _type: "link"; _key: string; href: string }[];
  children: LegalSpan[];
};

export type LegalPageContent = {
  title: string;
  body: LegalBlock[];
};

export const LEGAL_PAGES: { id: LegalPageKey; title: string }[] = [
  { id: "terms", title: "Terms of use" },
  { id: "privacy", title: "Privacy notice" },
];

type Part = string | { text: string; href: string };

/** Builds blocks with stable, unique keys. */
function builder(prefix: string) {
  let n = 0;
  const key = () => `${prefix}${++n}`;
  const block = (style: LegalBlock["style"], parts: Part[], listItem?: "bullet"): LegalBlock => {
    const markDefs: LegalBlock["markDefs"] = [];
    const children = parts.map((part): LegalSpan => {
      if (typeof part === "string") return { _type: "span", _key: key(), text: part, marks: [] };
      const link = { _type: "link" as const, _key: key(), href: part.href };
      markDefs.push(link);
      return { _type: "span", _key: key(), text: part.text, marks: [link._key] };
    });
    return {
      _type: "block",
      _key: key(),
      style,
      ...(listItem ? { listItem, level: 1 } : {}),
      markDefs,
      children,
    };
  };
  return {
    h2: (text: string) => block("h2", [text]),
    p: (...parts: Part[]) => block("normal", parts),
    li: (...parts: Part[]) => block("normal", parts, "bullet"),
  };
}

const LEGAL_LINE = "Avida Luna LLC, doing business as Avida Luna Wellness";

export function legalDefaults(email: string): Record<LegalPageKey, LegalPageContent> {
  const mail = { text: email, href: `mailto:${email}` };

  const t = builder("t");
  const terms: LegalPageContent = {
    title: "Terms of use",
    body: [
      t.p(`This website is run by ${LEGAL_LINE}, Lakewood Ranch, Florida.`),
      t.h2("General information, not medical advice"),
      t.p(
        "Everything on this website is general information. It is not medical advice and doesn’t replace a conversation with your own healthcare provider.",
      ),
      t.h2("Medical services"),
      t.p(
        "IV and other medical services are booked, screened and paid on our secure, HIPAA-compliant booking partner, under its own terms. A visit happens only if you are cleared through that screening.",
      ),
      t.h2("Restorative services, enhancements and packages"),
      t.p(
        "Restorative services, enhancements and the Vitamin Wellness Spray are non-medical and are paid at your visit. Prices are in US dollars. Every booking, including a package, is a one-time visit: there are no memberships, recurring charges or prepaid series. For a package with an IV or IM injection, the IV or injection is paid on our booking partner’s page and the rest at your visit. Cancellation and refund terms: TODO from Shary.",
      ),
      t.h2("Contact"),
      t.p("Questions: ", mail, ". See also our ", { text: "privacy notice", href: "/privacy" }, "."),
    ],
  };

  const p = builder("p");
  const privacy: LegalPageContent = {
    title: "Privacy notice",
    body: [
      p.p(`This website is run by ${LEGAL_LINE} (“we”), Lakewood Ranch, Florida. Questions: `, mail, "."),
      p.h2("What our forms collect"),
      p.li("Your name and email address."),
      p.li("Your phone number, only if you choose to give it."),
      p.li("Whether you ticked the box to get our emails."),
      p.li(
        "On the contact and group event forms: the topic, your message, and for events the date, city, group size and event type.",
      ),
      p.li(
        "If you choose to pay for add-ons or a package at your visit: your name, email, the package name, the non-medical items to bring and the amount due at your visit. Never which IV you chose.",
      ),
      p.li(
        "On the restorative visit request: your phone number, city or ZIP code, the package or services you chose, and two or three preferred dates and times.",
      ),
      p.li("For add-on payments: the appointment date you enter at checkout, and your payment, handled by Stripe."),
      p.h2("No health information"),
      p.p(
        "This website does not ask for or store health information: no symptoms, conditions, medications or health history. Please don’t include medical information in any message. Medical booking and screening happen with our secure, HIPAA-compliant booking partner, which has its own privacy policy.",
      ),
      p.h2("Who processes it"),
      p.li(
        "Netlify hosts this website. It also receives and stores the messages you send through our contact, group event, restorative visit request and “pay at my visit” forms, and emails them to us.",
      ),
      p.li(
        "Mailchimp runs our email list. When you ask for a booking link, it gets your first name, last name and email, plus where you signed up and whether you ticked the box, so it can send you one note with your booking link. We only send you other emails if you ticked the box. On /join and the restorative visit request, and on the contact and group event forms when you tick the box, it gets the same details.",
      ),
      p.li("Stripe processes add-on payments."),
      p.li("Sanity stores the website’s text and photos (not your form details)."),
      p.p("We don’t use advertising pixels, session recording or analytics on this website."),
      p.h2("Unsubscribe or delete your details"),
      p.p("Every email from our list has an unsubscribe link. To ask us to delete your details, email ", mail, "."),
      p.h2("More"),
      p.p("See also our ", { text: "terms", href: "/terms" }, "."),
    ],
  };

  return { terms, privacy };
}
