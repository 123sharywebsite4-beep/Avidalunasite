import type { Metadata } from "next";
import { RestorativeCancelled } from "@/components/RestorativeBooking";
import { getAddOns, getPackages, getSiteSettings } from "@/lib/content";
import { paymentsEnabled } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Checkout cancelled",
  description: "No charge was made.",
  path: "/book/restorative/cancel",
  noindex: true,
});

export default async function RestorativeCancelPage() {
  const [addOns, allPackages, settings] = await Promise.all([getAddOns(), getPackages(), getSiteSettings()]);
  const packages = allPackages.filter((p) => p.type === "restorative");
  return (
    <section className="container-page py-10 md:py-14">
      <div className="card mx-auto mb-8 max-w-2xl p-6 md:p-8" role="status" data-testid="restorative-cancelled">
        <h1 className="text-3xl md:text-4xl">No charge was made.</h1>
        <p className="mt-2">
          Your booking is saved below. You can continue to payment again, or send it as a request and pay at your
          visit.
        </p>
      </div>
      <RestorativeCancelled
        addOns={addOns}
        packages={packages}
        travelFee={settings.travelFee}
        paymentsEnabled={paymentsEnabled()}
      />
    </section>
  );
}
