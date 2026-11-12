import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHero } from "@/components/PageHero";
import { RestorativeFromUrl } from "@/components/RestorativeBooking";
import { RestorativeRequestForm } from "@/components/forms/RestorativeRequestForm";
import { getAddOns, getPackages, getSiteSettings } from "@/lib/content";
import { paymentsEnabled } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";
import { RESTORATIVE_HEADING, restorativeIntro } from "./copy";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Book Red Light & Compression Boots at Home | Avida Luna",
  description:
    "Book red light, compression boots and aromatherapy at home or work in Lakewood Ranch, Sarasota or Bradenton. Non-medical: no IV and no health screening.",
  path: "/book/restorative",
});

export default async function RestorativeBookingPage() {
  const [addOns, allPackages, settings] = await Promise.all([getAddOns(), getPackages(), getSiteSettings()]);
  const packages = allPackages.filter((p) => p.type === "restorative");
  const paymentsOn = paymentsEnabled();
  const props = { addOns, packages, travelFee: settings.travelFee, paymentsEnabled: paymentsOn };
  return (
    <div className="booking-page">
      <PageHero eyebrow="Book" heading={RESTORATIVE_HEADING} intro={restorativeIntro(paymentsOn)} />
      <section className="container-page py-10 md:py-14">
        {/* The server renders the form with nothing chosen; ?package= is applied in the browser. */}
        <Suspense fallback={<RestorativeRequestForm {...props} />}>
          <RestorativeFromUrl {...props} />
        </Suspense>
      </section>
    </div>
  );
}
