"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { IntakeForm } from "@/components/forms/IntakeForm";
import { type BookingSettings, PackageSummary } from "@/components/PackageSummary";
import { canBook } from "@/lib/packages";
import type { AddOn, WellnessPackage } from "@/lib/types";

/**
 * Picks the /book flow from the URL (read in the browser, so /book stays a static page):
 *   /book                    IV booking: details, then Hydreight, then enhancements
 *   /book?package=<iv slug>  the same, with the package's price split first
 *   /book?package=<luna>     moves to /book/restorative?package=<luna> (restorative visits have their own page)
 *   /book?restorative=1      moves to /book/restorative
 * next.config.ts redirects both on the server; the move here covers restorative packages whose
 * slug doesn't start with "luna-".
 * Packages whose booking isn't open yet (the B12 packages) show "Booking opens soon".
 */
export function BookingRouter({
  hydreightUrl,
  addOns,
  packages,
  settings,
  paymentsEnabled,
}: {
  hydreightUrl: string;
  addOns: AddOn[];
  packages: WellnessPackage[];
  settings: BookingSettings;
  paymentsEnabled: boolean;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const slug = params.get("package") ?? "";
  const pkg = packages.find((p) => p.slug === slug) ?? null;
  const restorativeUrl =
    pkg?.type === "restorative" ? `/book/restorative?package=${encodeURIComponent(pkg.slug)}` : !pkg && params.has("restorative") ? "/book/restorative" : null;

  useEffect(() => {
    if (restorativeUrl) router.replace(restorativeUrl);
  }, [restorativeUrl, router]);

  if (pkg && !canBook(pkg)) {
    return (
      <div className="card mx-auto max-w-2xl space-y-5 p-6 md:p-8" data-testid="booking-closed">
        <PackageSummary pkg={pkg} settings={settings} />
        <p className="pkg-soon">Booking opens soon</p>
        <p>
          Booking for this package isn&apos;t open yet. In the meantime, see our{" "}
          <Link href="/packages">other packages</Link> or <Link href="/contact">get in touch</Link>.
        </p>
      </div>
    );
  }

  if (restorativeUrl) {
    return (
      <p className="card mx-auto max-w-2xl p-6 md:p-8">
        Opening restorative booking… <Link href={restorativeUrl}>Continue</Link>
      </p>
    );
  }

  return (
    <>
      <IntakeForm
        key={pkg?.slug ?? "iv"}
        mode="book"
        hydreightUrl={hydreightUrl}
        addOns={addOns}
        paymentsEnabled={paymentsEnabled}
        pkg={pkg}
        settings={settings}
      />
      {pkg ? null : (
        <p className="mx-auto mt-6 max-w-2xl text-[0.9375rem] text-muted">
          Red light, compression boots or aromatherapy only, with no IV?{" "}
          <Link href="/book/restorative">Book a restorative visit</Link>. Booking a package?{" "}
          <Link href="/packages">See packages</Link>.
        </p>
      )}
    </>
  );
}
