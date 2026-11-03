import Link from "next/link";
import { LEGAL_LINE } from "@/lib/constants";
import type { SiteSettings } from "@/lib/types";
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon } from "./Icons";
import { Logo } from "./Logo";
import { Todo } from "./Todo";

const pageLinks = [
  { href: "/services", label: "Services" },
  { href: "/packages", label: "Packages" },
  { href: "/events", label: "Group & corporate" },
  { href: "/about", label: "About Shary" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/add-ons", label: "Enhancements" },
  { href: "/wellness-education", label: "Wellness education" },
  { href: "/book", label: "Book an appointment" },
];

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto">
      <div className="band-ink on-ink">
        <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Logo placement="footer" />
            <p className="mt-4 max-w-sm">
              Nurse-led mobile IV hydration in Lakewood Ranch, FL. Professional care, personally delivered by Shary
              Gonzalez, RN, BSN.
            </p>
            <p className="mt-2 font-semibold">Se habla español.</p>
          </div>

          <div>
            <h2 className="text-base">Get in touch</h2>
            <ul className="mt-3 space-y-2">
              <li>
                <a href={settings.phoneTel} className="inline-flex items-center gap-2">
                  <PhoneIcon /> {settings.phoneDisplay}
                </a>
              </li>
              <li>
                <a href={`mailto:${settings.email}`} className="inline-flex items-center gap-2 break-all">
                  <MailIcon /> {settings.email}
                </a>
              </li>
              {settings.instagram ? (
                <li>
                  <a href={settings.instagram} className="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                    <InstagramIcon /> Instagram
                  </a>
                </li>
              ) : null}
              {settings.facebook ? (
                <li>
                  <a href={settings.facebook} className="inline-flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                    <FacebookIcon /> Facebook
                  </a>
                </li>
              ) : null}
              <li>{settings.serviceArea}</li>
            </ul>
            {!settings.instagram || !settings.facebook ? (
              <Todo className="mt-3">Instagram and Facebook links (Sanity: Contact info).</Todo>
            ) : null}
          </div>

          <nav aria-label="Footer">
            <h2 className="text-base">Pages</h2>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 md:grid-cols-1">
              {pageLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="container-page border-t border-cream/20 py-6 text-[0.9375rem]">
          <p className="prose-width">{settings.footerNote}</p>
          <Todo className="mt-2">Shary to confirm the footer note wording.</Todo>
          <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <p>
              © {year} {LEGAL_LINE}. Lakewood Ranch, FL.
            </p>
            <p className="flex gap-4">
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
