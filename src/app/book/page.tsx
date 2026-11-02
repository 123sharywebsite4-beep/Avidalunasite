import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingRouter } from "@/components/BookingRouter";
import { PageHero } from "@/components/PageHero";
import { HYDREIGHT_BOOKING_URL } from "@/lib/constants";
import { getAddOns, getPackages, getPageText, getSiteSettings } from "@/lib/content";
import { paymentsEnabled } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Book In-Home IV Therapy in Lakewood Ranch | Avida Luna",
  description:
    "Book mobile IV therapy at home in Lakewood Ranch, Sarasota or Bradenton. Share your name and email, then pick your drip and time and complete a short screening.",
  path: "/book",
});

export default async function BookPage() {
  const [text, addOns, packages, settings] = await Promise.all([
    getPageText("book"),
    getAddOns(),
    getPackages(),
    getSiteSettings(),
  ]);
  const bookingSettings = {
    travelFee: settings.travelFee,
    travelIncludedMinutes: settings.travelIncludedMinutes,
    ivInfusionTime: settings.ivInfusionTime,
    ivAppointmentTime: settings.ivAppointmentTime,
  };
  return (
    <div className="booking-page">
      <PageHero eyebrow="Book" heading={text.heading} intro={text.intro} />
      {/* Steps 1 and 2 are narrow; step 3 (enhancements) uses the full width. */}
      <section className="container-page py-10 md:py-14">
        {/* The flow depends on ?package= / ?restorative, read in the browser so the page stays static. */}
        <Suspense fallback={<p className="card mx-auto max-w-2xl p-6 md:p-8">Loading your booking options…</p>}>
          <BookingRouter
            hydreightUrl={HYDREIGHT_BOOKING_URL}
            addOns={addOns}
            packages={packages}
            settings={bookingSettings}
            paymentsEnabled={paymentsEnabled()}
          />
        </Suspense>
      </section>
    </div>
  );
}
