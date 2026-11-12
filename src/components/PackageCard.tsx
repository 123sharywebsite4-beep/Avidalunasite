import Link from "next/link";
import { formatPrice } from "@/lib/format";
import {
  atVisitPart,
  canBook,
  includedLines,
  isMedical,
  MEDICAL_CONSULTATION_LINE,
  medicalPart,
} from "@/lib/packages";
import type { WellnessPackage } from "@/lib/types";

/** One package: what's included, the price (and the total with travel for restorative), the booking button. */
export function PackageCard({ pkg, travelFee }: { pkg: WellnessPackage; travelFee: number }) {
  const headingId = `${pkg.id}-name`;
  const medical = medicalPart(pkg);
  return (
    <article className="pkg-card" aria-labelledby={headingId} data-testid={`package-${pkg.slug}`}>
      <h3 id={headingId}>{pkg.name}</h3>
      <ul className="pkg-card-includes" aria-label={`${pkg.name} includes`}>
        {includedLines(pkg).map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="pkg-card-price">{formatPrice(pkg.price)}</p>
      {pkg.type === "restorative" ? (
        <p className="pkg-card-sub">
          {formatPrice(pkg.price + travelFee)} with the {formatPrice(travelFee)} travel fee
        </p>
      ) : (
        <p className="pkg-card-sub">
          {medical.varies ? "From " : ""}
          {formatPrice(medical.amount)} on the secure booking page + {formatPrice(atVisitPart(pkg))} at your visit
        </p>
      )}
      {pkg.ivChoices.length ? (
        <p className="pkg-card-note">
          You choose {pkg.ivChoices.map((c) => c.name).join(" or ")} on the secure booking page, subject to
          medical approval.
        </p>
      ) : null}
      {isMedical(pkg) ? <p className="pkg-card-note">{MEDICAL_CONSULTATION_LINE}</p> : null}
      {canBook(pkg) ? (
        <Link
          href={pkg.type === "restorative" ? `/book/restorative?package=${pkg.slug}` : `/book?package=${pkg.slug}`}
          className="btn btn-outline"
          aria-label={`Book this package: ${pkg.name}`}
        >
          Book this package
        </Link>
      ) : (
        <p className="pkg-soon" data-testid="booking-soon">
          Booking opens soon
        </p>
      )}
    </article>
  );
}
