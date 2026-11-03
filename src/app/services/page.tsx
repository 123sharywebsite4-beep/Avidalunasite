import type { Metadata } from "next";
import Link from "next/link";
import { FinalCta } from "@/components/FinalCta";
import { HowItWorks } from "@/components/HowItWorks";
import { IvServiceCard } from "@/components/Cards";
import { FaqList } from "@/components/FaqList";
import { ArrowRightIcon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { IvTiming, IvTravel } from "@/components/PackageGroups";
import { PageHero } from "@/components/PageHero";
import { getAddOns, getFaqs, getPackages, getPageText, getServices, getSiteSettings } from "@/lib/content";
import { formatDuration, formatPrice } from "@/lib/format";
import { enhancementPrice, includedLines } from "@/lib/packages";
import { faqSchema, servicesSchema } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import type { Service } from "@/lib/types";
import { cityAreas, serviceAreas } from "@content/fallback";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "IV Drips & B12 Shots at Home in Lakewood Ranch | Avida Luna",
  description:
    "IV drip menu: Hydration from $99, Myers cocktail, Energy and Athlete Recovery, plus B12 shots. A registered nurse comes to you in Lakewood Ranch and Sarasota.",
  path: "/services",
});

export default async function ServicesPage() {
  const [text, services, addOns, faqs, packages, settings] = await Promise.all([
    getPageText("services"),
    getServices(),
    getAddOns(),
    getFaqs("services"),
    getPackages(),
    getSiteSettings(),
  ]);
  const s = text.sections;
  const drips = services.filter((x) => x.category === "iv");
  const boosts = services.filter((x) => x.category === "boost");
  const vitamins = services.filter((x) => x.category === "vitamin");
  const extras = addOns.filter((a) => !a.todo);
  const jumpLinks = [
    { href: "#iv-drips", label: "IV drips", show: drips.length > 0 },
    { href: "#packages", label: "Packages", show: packages.length > 0 },
    { href: "#boosts", label: "Drip add-ins", show: boosts.length > 0 },
    { href: "#injections", label: "Injections", show: vitamins.length > 0 },
    { href: "#consultation", label: "Consultations", show: true },
    { href: "#add-ons", label: "Restorative", show: true },
    { href: "#groups", label: "Groups", show: true },
    { href: "#areas", label: "Areas", show: true },
    { href: "#questions", label: "Questions", show: faqs.length > 0 },
  ].filter((l) => l.show);
  const otherAreas = serviceAreas.filter((a) => !cityAreas.some((c) => c.city === a));

  return (
    <>
      <PageHero eyebrow="Services" heading={text.heading} intro={text.intro}>
        <Link href="/book" className="btn btn-primary mt-7">
          Book an appointment
        </Link>
        <nav aria-label="On this page" className="service-jump">
          {jumpLinks.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
      </PageHero>

      <section
        id="iv-drips"
        className="container-page scroll-mt-32 py-12 md:py-16"
        aria-labelledby="iv-heading"
        data-section="iv-services"
      >
        <p className="eyebrow">Core service</p>
        <h2 id="iv-heading" className="mt-2 text-3xl md:text-4xl">
          {s.iv?.heading}
        </h2>
        {s.iv?.text ? (
          <p className="prose-width mt-3 text-muted">{s.iv.text}</p>
        ) : null}
        <div className="iv-grid">
          {drips.map((service) => (
            <IvServiceCard key={service.id} service={service} />
          ))}
        </div>
        <div className="iv-note">
          <p>
            Every visit begins with a clinical assessment by your registered
            nurse. Eligibility is confirmed through a short, HIPAA-compliant health
            screening before any IV is placed, and some services may not be
            right for everyone. Availability depends on your location and
            scheduling.
          </p>
          <IvTiming settings={settings} />
          <IvTravel settings={settings} />
          <p>
            {drips.some((service) => service.todo)
              ? "Starting prices and menu details are pending Shary’s confirmation. "
              : ""}
            Final service selection and pricing are confirmed when you book.
          </p>
        </div>
      </section>

      {packages.length ? (
        <section
          id="packages"
          className="container-page scroll-mt-32 pb-12 md:pb-16"
          aria-labelledby="packages-heading"
        >
          <div className="price-panel">
            <div>
              <p className="eyebrow">One visit, one price</p>
              <h2 id="packages-heading" className="mt-2 text-3xl md:text-4xl">
                {s.packages?.heading}
              </h2>
              {s.packages?.text ? <p className="mt-3 text-muted">{s.packages.text}</p> : null}
              <Link href="/packages" className="btn btn-outline mt-6">
                See all packages <ArrowRightIcon />
              </Link>
            </div>
            <ul className="price-list">
              {packages.map((p) => (
                <li key={p.id}>
                  <div>
                    <h3>{p.name}</h3>
                    <p>{includedLines(p).join(" · ")}</p>
                  </div>
                  <p className="price-list-price">{formatPrice(p.price)}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {boosts.length ? (
        <section
          id="boosts"
          className="container-page scroll-mt-32 pb-12 md:pb-16"
          aria-labelledby="boost-heading"
        >
          <div className="price-panel">
            <div>
              <p className="eyebrow">Add to any IV</p>
              <h2 id="boost-heading" className="mt-2 text-3xl md:text-4xl">
                {s.boost?.heading}
              </h2>
              {s.boost?.text ? (
                <p className="mt-3 text-muted">{s.boost.text}</p>
              ) : null}
            </div>
            <PriceList items={boosts} />
          </div>
        </section>
      ) : null}

      {vitamins.length ? (
        <section
          id="injections"
          className="container-page scroll-mt-32 pb-12 md:pb-16"
          aria-labelledby="vitamin-heading"
        >
          <div className="price-panel">
            <div>
              <p className="eyebrow">Quick visits</p>
              <h2 id="vitamin-heading" className="mt-2 text-3xl md:text-4xl">
                {s.vitamin?.heading}
              </h2>
              {s.vitamin?.text ? (
                <p className="mt-3 text-muted">{s.vitamin.text}</p>
              ) : null}
              <p className="pkg-soon mt-6" data-testid="injection-booking-soon">
                Booking opens soon
              </p>
            </div>
            <PriceList items={vitamins} />
          </div>
        </section>
      ) : null}

      <section
        id="consultation"
        className="container-page scroll-mt-32 pb-12 md:pb-16"
        aria-labelledby="consult-heading"
      >
        <div className="practice-feature">
          <div>
            <p className="eyebrow mb-4">PERSONAL ATTENTION</p>
            <h2 id="consult-heading" className="text-3xl md:text-4xl">
              {s.consultation?.heading}
            </h2>
          </div>
          <div>
            <p className="prose-width text-muted">{s.consultation?.text}</p>
            <Link href="/book" className="btn btn-outline mt-6">
              Book an appointment
            </Link>
          </div>
        </div>
      </section>


      <section
        id="add-ons"
        className="container-page scroll-mt-32 pb-12 md:pb-16"
        aria-labelledby="addons-heading"
      >
        <div className="price-panel">
          <div>
            <p className="eyebrow">Restorative · non-medical</p>
            <h2 id="addons-heading" className="mt-2 text-3xl md:text-4xl">
              {s.addons?.heading}
            </h2>
            <p className="mt-3 text-muted">{s.addons?.text}</p>
            <p className="mt-3 text-[0.9375rem] text-muted">
              Restorative-only visits have a {formatPrice(settings.travelFee)} travel fee, once per appointment.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/book?restorative=1" className="btn btn-outline">
                Request a restorative visit <ArrowRightIcon />
              </Link>
              <Link href="/add-ons" className="btn btn-outline">
                Add to a booked visit
              </Link>
            </div>
          </div>
          {extras.length ? (
            <ul className="price-list">
              {extras.map((a) => (
                <li key={a.id}>
                  <div>
                    <h3>{a.name}</h3>
                    <p>{a.description}</p>
                  </div>
                  <p className="price-list-price">
                    {formatPrice(a.price)}
                    <small>
                      {formatPrice(enhancementPrice(a))} {a.kind === "product" ? "with a service or package" : "as an enhancement"}
                    </small>
                    {a.durationMinutes ? (
                      <small>{formatDuration(a.durationMinutes)}</small>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <section id="groups" className="container-page scroll-mt-32 pb-12 md:pb-16">
        <div className="practice-feature">
          <div>
            <p className="eyebrow mb-4">CARE, TOGETHER</p>
            <h2>{s.groups?.heading}</h2>
          </div>
          <div>
            <p>{s.groups?.text}</p>
            <Link href="/events" className="btn btn-outline mt-6">
              Plan a group IV event <ArrowRightIcon />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="areas"
        className="container-page scroll-mt-32 pb-12 md:pb-16"
        aria-labelledby="areas-heading"
      >
        <p className="eyebrow">We come to you</p>
        <h2 id="areas-heading" className="mt-2 text-3xl md:text-4xl">
          {s.areas?.heading}
        </h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
          {cityAreas.map((c) => (
            <div key={c.city} className="card p-5 md:p-6">
              <h3 className="text-xl">Mobile IV therapy in {c.city}</h3>
              <p className="mt-2 text-muted">{c.text}</p>
            </div>
          ))}
        </div>
        <p className="prose-width mt-6 text-muted">
          Also serving {otherAreas.join(", ")}. {s.areas?.text}
        </p>
      </section>
      <section className="band-sage on-sage" aria-labelledby="how-heading">
        <div className="container-page py-12 md:py-16">
          <h2 id="how-heading" className="text-3xl md:text-4xl">
            {s.how?.heading}
          </h2>
          <div className="mt-6">
            <HowItWorks compact />
          </div>
        </div>
      </section>


      {faqs.length ? (
        <section
          id="questions"
          className="container-page max-w-3xl scroll-mt-32 py-12 md:py-16"
          aria-labelledby="questions-heading"
        >
          <h2 id="questions-heading" className="text-3xl md:text-4xl">
            {s.faq?.heading}
          </h2>
          <div className="mt-6">
            <FaqList faqs={faqs} />
          </div>
          <p className="mt-6">
            More about booking, safety and payment on our{" "}
            <Link href="/faq">mobile IV FAQ</Link>.
          </p>
          <JsonLd data={faqSchema(faqs)} />
        </section>
      ) : null}

      <JsonLd data={servicesSchema(services)} />
      <FinalCta />
    </>
  );
}

/** Compact name / description / price rows for drip add-ins and injections. */
function PriceList({ items }: { items: Service[] }) {
  return (
    <ul className="price-list">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
          </div>
          {item.showPrice && item.price !== null ? (
            <p className="price-list-price">{formatPrice(item.price)}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
