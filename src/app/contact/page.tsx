import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/forms/ContactForm";
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon } from "@/components/Icons";
import { PageHero } from "@/components/PageHero";
import { Todo } from "@/components/Todo";
import { getPageText, getSiteSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Contact Avida Luna | Mobile IV Nurse in Lakewood Ranch, FL",
  description:
    "Call (941) 348-6972 or email Shary Gonzalez, RN, BSN, about mobile IV therapy, group IV events or partnerships in Lakewood Ranch and Sarasota. Se habla español.",
  path: "/contact",
});

export default async function ContactPage() {
  const [text, settings] = await Promise.all([getPageText("contact"), getSiteSettings()]);
  return (
    <>
      <PageHero heading={text.heading} intro={text.intro} />
      <section className="container-page grid gap-10 py-12 md:grid-cols-[1fr_1.4fr] md:py-16">
        <div>
          <h2 className="text-3xl">Reach Shary directly</h2>
          <ul className="mt-5 space-y-4">
            <li>
              <a href={settings.phoneTel} className="inline-flex items-center gap-3 text-lg font-semibold">
                <PhoneIcon /> {settings.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-3 break-all text-lg">
                <MailIcon /> {settings.email}
              </a>
            </li>
            {settings.instagram ? (
              <li>
                <a href={settings.instagram} className="inline-flex items-center gap-3 text-lg" target="_blank" rel="noopener noreferrer">
                  <InstagramIcon /> Instagram
                </a>
              </li>
            ) : null}
            {settings.facebook ? (
              <li>
                <a href={settings.facebook} className="inline-flex items-center gap-3 text-lg" target="_blank" rel="noopener noreferrer">
                  <FacebookIcon /> Facebook
                </a>
              </li>
            ) : null}
          </ul>
          <h3 className="mt-8 text-lg">Mobile IV service area</h3>
          <p>{settings.serviceArea}</p>
          <Todo className="mt-2">Confirm the service area with Shary.</Todo>
          <p className="mt-4 font-semibold">Se habla español.</p>
          <Link href="/book" className="btn btn-primary mt-8">
            Book an appointment
          </Link>
          <p className="mt-4 text-[0.9375rem]">
            Planning a group or corporate visit? Use the <Link href="/events#request">group request form</Link>.
          </p>
        </div>
        <div>
          <h2 className="text-3xl">Send a message</h2>
          <div className="mt-5">
            <ContactForm contactEmail={settings.email} />
          </div>
        </div>
      </section>
    </>
  );
}
