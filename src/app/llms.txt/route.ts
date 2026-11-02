import { cityAreas, serviceAreas } from "@content/fallback";
import { BRAND_NAME, LEGAL_LINE, SITE_URL } from "@/lib/constants";
import { getAddOns, getFaqs, getPackages, getServices, getSiteSettings } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { atVisitPart, enhancementPrice, includedLines, isMedical, MEDICAL_CONSULTATION_LINE, medicalPart } from "@/lib/packages";
import type { Faq, Service } from "@/lib/types";

// /llms.txt: a plain-Markdown summary of the site for AI assistants (llmstxt.org).
// Built from the same content as the pages, refreshed hourly like them.
export const dynamic = "force-static";
export const revalidate = 3600;

const pages = [
  ["Services and prices", "/services", "IV drip menu, vitamin injections, drip add-ins, consultations and the areas served"],
  ["Wellness packages", "/packages", "Restorative, IV and B12 wellness packages; one-time bookings only"],
  ["Group IV events", "/events", "IV hydration for workplaces, bachelorette and bridal parties, celebrations and community events"],
  ["FAQ", "/faq", "Cost, booking, screening, safety, payment and service area"],
  ["About Shary Gonzalez, RN, BSN", "/about", "The registered nurse behind Avida Luna Wellness"],
  ["Book an appointment", "/book", "Start a booking; scheduling, screening and payment finish on a secure, HIPAA-compliant booking page"],
  ["Restorative enhancements", "/add-ons", "Red light, compression boots, aromatherapy and a take-home spray for a booked appointment, at enhancement prices"],
  ["Contact", "/contact", "Phone, email and contact form"],
];

function priced(items: Service[]) {
  return items
    .filter((s) => !s.todo)
    .map((s) => {
      const price = s.showPrice && s.price !== null ? `: ${formatPrice(s.price)}` : "";
      const option = s.optionName && s.optionPrice ? ` (${s.optionName.toLowerCase()}: ${formatPrice(s.optionPrice)})` : "";
      return `- ${s.name}${price}${option}. ${s.description}`;
    });
}

function answers(faqs: Faq[]) {
  return faqs.filter((f) => !f.todo).flatMap((f) => [`### ${f.question}`, "", f.answer, ""]);
}

export async function GET() {
  const [settings, services, addOns, faqs, serviceFaqs, packages] = await Promise.all([
    getSiteSettings(),
    getServices(),
    getAddOns(),
    getFaqs(),
    getFaqs("services"),
    getPackages(),
  ]);
  const of = (category: Service["category"]) => services.filter((s) => s.category === category);
  const lines = [
    `# ${BRAND_NAME}`,
    "",
    `> Nurse-led mobile IV therapy in Lakewood Ranch, Sarasota and Bradenton, Florida. Shary Gonzalez, RN, BSN, brings IV hydration drips, vitamin injections and group IV events to clients' homes, offices and events. There is no clinic or IV lounge: every service is mobile.`,
    "",
    `- Business: ${LEGAL_LINE}`,
    "- Nurse and founder: Shary Gonzalez, Registered Nurse (BSN), 17+ years in nursing, 25 years in healthcare",
    "- Languages: English and Spanish (se habla español)",
    `- Areas served: ${cityAreas.map((c) => c.city).join(", ")}, and nearby ${serviceAreas.filter((a) => !cityAreas.some((c) => c.city === a)).join(", ")} (Florida). Home base: Lakewood Ranch.`,
    `- Phone: ${settings.phoneDisplay}`,
    `- Email: ${settings.email}`,
    `- Booking: ${SITE_URL}/book. Service selection, a confidential health screening and payment happen on a secure, HIPAA-compliant booking page. Shary reviews the screening and assesses each client in person before any IV or injection.`,
    "- This website is general information, not medical advice. Not every service is right for everyone.",
    "",
    "## Pages",
    "",
    ...pages.map(([name, path, note]) => `- [${name}](${SITE_URL}${path}): ${note}`),
    "",
    "## IV drips",
    "",
    ...priced(of("iv")),
    "",
    `IV infusion time: ${settings.ivInfusionTime}. Total appointment time: ${settings.ivAppointmentTime}`,
    `Travel for IV appointments is included within a ${settings.travelIncludedMinutes}-minute one-way drive from Shary's service starting location. Additional travel charges may apply and will be confirmed before booking.`,
    "",
    "## IM injections",
    "",
    ...priced(of("vitamin")),
    "",
    "## IV nutrient add-ons (added to an IV)",
    "",
    ...priced(of("boost")),
    "",
    "## Restorative services and products (non-medical, paid at the visit)",
    "",
    ...addOns
      .filter((a) => !a.todo)
      .map((a) => `- ${a.name}: ${formatPrice(a.price)} standalone, ${formatPrice(enhancementPrice(a))} as an enhancement. ${a.description}`),
    `- Restorative-only appointments: ${formatPrice(settings.travelFee)} travel fee, once per appointment.`,
    "",
    "## Wellness packages (one-time bookings; no memberships)",
    "",
    ...packages.map((p) => {
      const split = isMedical(p)
        ? ` (${formatPrice(medicalPart(p).amount)} on the secure booking page + ${formatPrice(atVisitPart(p))} at the visit). ${MEDICAL_CONSULTATION_LINE}`
        : ` (${formatPrice(p.price + settings.travelFee)} with travel)`;
      return `- ${p.name}: ${includedLines(p).join(", ")}. ${formatPrice(p.price)}${split}${p.bookingOpen ? "" : " Booking opens soon."}`;
    }),
    "",
    "Final service selection and pricing are confirmed when you book.",
    "",
    "## Frequently asked questions",
    "",
    ...answers([...faqs, ...serviceFaqs]),
    "## Optional",
    "",
    `- [Wellness education](${SITE_URL}/wellness-education): Plain-language reading from Shary`,
    `- [Privacy notice](${SITE_URL}/privacy)`,
    `- [Terms of use](${SITE_URL}/terms)`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
