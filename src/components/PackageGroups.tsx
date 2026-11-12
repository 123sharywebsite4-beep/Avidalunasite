import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { IV_TRAVEL_NOTE, PACKAGE_GROUPS } from "@/lib/packages";
import type { SiteSettings, WellnessPackage } from "@/lib/types";
import { PackageCard } from "./PackageCard";

/** IV timing, always as two separate things: the infusion, and the whole appointment. */
export function IvTiming({ settings, className }: { settings: SiteSettings; className?: string }) {
  return (
    <p className={className} data-testid="iv-timing">
      <strong className="font-semibold">IV infusion time:</strong> {settings.ivInfusionTime}.{" "}
      <strong className="font-semibold">Total appointment time:</strong> {settings.ivAppointmentTime}
    </p>
  );
}

/** IV travel wording: included within the drive time, no travel fee. */
export function IvTravel({ settings, className }: { settings: SiteSettings; className?: string }) {
  return (
    <p className={className}>
      Travel is included within a {settings.travelIncludedMinutes}-minute one-way drive from Shary&apos;s service
      starting location. {IV_TRAVEL_NOTE}
    </p>
  );
}

/** The three package groups. Also used on /services. */
export function PackageGroups({
  packages,
  settings,
  sections,
  paymentsOn,
  headingLevel = "h2",
}: {
  packages: WellnessPackage[];
  settings: SiteSettings;
  sections: Record<string, { heading?: string; text?: string }>;
  /** Online payment (Stripe) is on: restorative visits are paid when booked, not at the visit. */
  paymentsOn: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  return (
    <>
      {PACKAGE_GROUPS.map((g) => {
        const list = packages.filter((p) => p.type === g.type);
        if (!list.length) return null;
        const s = sections[g.type];
        return (
          <section
            key={g.type}
            id={g.id}
            className="container-page scroll-mt-32 py-10 md:py-14"
            aria-labelledby={`${g.id}-heading`}
          >
            <p className="eyebrow">{g.eyebrow}</p>
            <Heading id={`${g.id}-heading`} className="mt-2 text-3xl md:text-4xl">
              {s?.heading}
            </Heading>
            {s?.text ? <p className="prose-width mt-3 text-muted">{s.text}</p> : null}
            <div className="iv-grid">
              {list.map((p) => (
                <PackageCard key={p.id} pkg={p} travelFee={settings.travelFee} />
              ))}
            </div>
            <div className="iv-note">
              <GroupNote type={g.type} settings={settings} paymentsOn={paymentsOn} />
            </div>
          </section>
        );
      })}
    </>
  );
}

function GroupNote({
  type,
  settings,
  paymentsOn,
}: {
  type: WellnessPackage["type"];
  settings: SiteSettings;
  paymentsOn: boolean;
}) {
  if (type === "restorative") {
    return (
      <>
        <p>
          A {formatPrice(settings.travelFee)} travel fee applies once per appointment. You&apos;ll see it and your
          total before you book, and you{" "}
          {paymentsOn ? "pay securely online when you book" : "pay at your visit"}. Shary confirms your time by text
          or email.
        </p>
        <p>
          Just one service? <Link href="/book/restorative">Book a restorative visit</Link>.
        </p>
      </>
    );
  }
  if (type === "iv") {
    return (
      <>
        <IvTravel settings={settings} />
        <IvTiming settings={settings} />
      </>
    );
  }
  return <p>Booking for B12 wellness packages and IM injections opens soon.</p>;
}
