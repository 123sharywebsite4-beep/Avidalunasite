import type { Metadata } from "next";
import { GroupRequestForm } from "@/components/forms/GroupRequestForm";
import { CheckIcon } from "@/components/Icons";
import { JsonLd } from "@/components/JsonLd";
import { PageHero } from "@/components/PageHero";
import { Todo } from "@/components/Todo";
import { BRAND_NAME, SITE_URL } from "@/lib/constants";
import { getPageText, getSiteSettings, getUpcomingEvents, todayInFlorida } from "@/lib/content";
import { floridaIso, formatEventDate, formatTime } from "@/lib/format";
import { groupEventsSchema } from "@/lib/schema";
import { pageMetadata } from "@/lib/seo";
import type { EventItem } from "@/lib/types";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Group IV Therapy & IV Parties in Sarasota | Avida Luna",
  description:
    "IV hydration parties, bachelorette IV and corporate wellness days in Sarasota, Lakewood Ranch and Bradenton. A registered nurse screens every guest.",
  path: "/events",
});

const steps = [
  { title: "Send a request", text: "Tell us the date, the location and about how many guests." },
  { title: "Plan with Shary", text: "She'll reach out to talk through timing, setup and how each guest books and is screened." },
  { title: "Shary manages care on site", text: "She arrives, sets up, assesses each guest and manages every IV herself." },
];

const audiences = [
  "Workplace and corporate wellness days",
  "Bachelorette and bridal parties",
  "Private IV hydration parties and celebrations",
  "Group trips and visiting friends",
  "Community events and local businesses",
];

function eventSchema(e: EventItem) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.title,
    startDate: floridaIso(e.date, e.startTime),
    ...(e.endTime ? { endDate: floridaIso(e.date, e.endTime) } : {}),
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: e.place, address: e.place },
    description: e.description,
    organizer: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
    ...(e.image ? { image: e.image.src } : {}),
  };
}

export default async function EventsPage() {
  const [text, events, settings] = await Promise.all([getPageText("events"), getUpcomingEvents(), getSiteSettings()]);
  const s = text.sections;

  return (
    <>
      <PageHero eyebrow="Group & corporate" heading={text.heading} intro={text.intro}>
        <a href="#request" className="btn btn-primary mt-7">
          Request a group IV event
        </a>
      </PageHero>

      <section className="container-page py-12 md:py-16" aria-labelledby="who-heading">
        <h2 id="who-heading" className="text-3xl md:text-4xl">
          {s.who?.heading}
        </h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a) => (
            <li key={a} className="flex gap-2">
              <CheckIcon className="mt-1 size-5 shrink-0 text-olive" /> {a}
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page pb-12 md:pb-16" aria-labelledby="how-heading">
        <h2 id="how-heading" className="text-3xl md:text-4xl">
          {s.how?.heading}
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3 md:gap-6">
          {steps.map((step, i) => (
            <li key={step.title} className="card flex gap-4 p-5 md:flex-col md:p-6">
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-md bg-olive font-display text-lg font-semibold text-white"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg">{step.title}</h3>
                <p className="mt-1 text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <Todo className="mt-5 max-w-2xl">
          Group pricing or minimums (only if Shary wants them listed), and how each guest books and is screened on
          the booking page for a group visit.
        </Todo>
      </section>

      <section className="container-page pb-12 md:pb-16" aria-labelledby="upcoming-heading">
        <h2 id="upcoming-heading" className="text-3xl md:text-4xl">
          {s.upcoming?.heading}
        </h2>
        {events.length === 0 ? (
          <p className="card mt-5 p-6" data-testid="no-events">
            {s.upcoming?.text}
          </p>
        ) : (
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {events.map((e) => (
              <li key={e.id} className="card p-6">
                <p className="eyebrow">
                  <time dateTime={e.date}>{formatEventDate(e.date)}</time>
                  {e.startTime
                    ? ` · ${formatTime(e.startTime)}${e.endTime ? `–${formatTime(e.endTime)}` : ""}`
                    : ""}
                </p>
                <h3 className="mt-2 text-2xl">{e.title}</h3>
                <p className="mt-1 font-semibold">{e.place}</p>
                <p className="mt-2">{e.description}</p>
                {e.link ? (
                  <a href={e.link} className="mt-3 inline-block font-semibold" rel="noopener">
                    Event details
                  </a>
                ) : null}
                <JsonLd data={eventSchema(e)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="request" className="container-page scroll-mt-32 pb-14 md:pb-20" aria-labelledby="request-heading">
        <div className="max-w-2xl">
          <h2 id="request-heading" className="text-3xl md:text-4xl">
            {s.form?.heading}
          </h2>
          <p className="mt-2">{s.form?.text}</p>
          <div className="mt-6">
            <GroupRequestForm minDate={todayInFlorida()} contactEmail={settings.email} />
          </div>
        </div>
      </section>
      <JsonLd data={groupEventsSchema()} />
    </>
  );
}
