import type { Metadata } from "next";
import Link from "next/link";
import { FaqList } from "@/components/FaqList";
import { FinalCta } from "@/components/FinalCta";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { getFaqs, getPageText } from "@/lib/content";
import { faqSchema } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Mobile IV Therapy FAQ: Cost, Booking & Safety | Avida Luna",
  description:
    "How much mobile IV therapy costs, how booking and screening work, and what to expect at an in-home IV visit in Lakewood Ranch, Sarasota and Bradenton.",
  path: "/faq",
});

// Questions are grouped by id. Any question added in Sanity that isn't listed here
// shows under "More questions", so nothing is ever hidden.
const groups = [
  { heading: "About mobile IV therapy", ids: ["faq-what-is", "faq-services", "faq-cost", "faq-spanish"] },
  { heading: "Booking and payment", ids: ["faq-book", "faq-pay", "faq-packages", "faq-addons", "faq-cancel"] },
  { heading: "Your in-home IV visit", ids: ["faq-get-started", "faq-before", "faq-during", "faq-length", "faq-who"] },
  { heading: "Safety and eligibility", ids: ["faq-eligibility", "faq-safety"] },
  { heading: "Service area and group events", ids: ["faq-travel", "faq-groups"] },
];

export default async function FaqPage() {
  const [text, faqs] = await Promise.all([getPageText("faq"), getFaqs()]);
  const grouped = new Set(groups.flatMap((g) => g.ids));
  const sections = [
    ...groups.map((g) => ({ heading: g.heading, faqs: faqs.filter((f) => g.ids.includes(f.id)) })),
    { heading: "More questions", faqs: faqs.filter((f) => !grouped.has(f.id)) },
  ].filter((g) => g.faqs.length);
  return (
    <>
      <PageHero heading={text.heading} intro={text.intro} />
      <section className="container-page max-w-3xl space-y-10 py-12 md:space-y-12 md:py-16">
        {sections.map((g) => (
          <div key={g.heading}>
            <h2 className="mb-5 text-2xl md:text-3xl">{g.heading}</h2>
            <FaqList faqs={g.faqs} />
          </div>
        ))}
        <p>
          Questions about a specific drip or injection? See{" "}
          <Link href="/services#questions">IV drip and injection questions</Link>. Didn&apos;t find your answer?{" "}
          <Link href="/contact">Get in touch</Link>.
        </p>
      </section>
      <JsonLd data={faqSchema(faqs)} />
      <FinalCta />
    </>
  );
}
