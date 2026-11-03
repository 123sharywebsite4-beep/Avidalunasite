import { formatPrice } from "@/lib/format";
import {
  atVisitPart,
  IV_TRAVEL_NOTE,
  isMedical,
  MEDICAL_CONSULTATION_LINE,
  medicalLabel,
  medicalPart,
  restorativeItems,
} from "@/lib/packages";
import type { WellnessPackage } from "@/lib/types";

/** The settings booking needs on the client: travel and IV timing. */
export type BookingSettings = {
  travelFee: number;
  travelIncludedMinutes: number;
  ivInfusionTime: string;
  ivAppointmentTime: string;
};

/**
 * /book step 1 for a package: the package, its price, and the split between what's paid on the
 * secure booking page (the IV or injection) and what's paid at the visit (everything else).
 */
export function PackageSummary({ pkg, settings }: { pkg: WellnessPackage; settings: BookingSettings }) {
  const medical = medicalPart(pkg);
  const extras = restorativeItems(pkg).map((i) => i.name);
  return (
    <div className="rounded-xl border border-olive/15 bg-paper p-5" data-testid="package-summary">
      <p className="eyebrow mb-2">YOUR PACKAGE</p>
      <h2 className="text-2xl md:text-3xl">{pkg.name}</h2>
      <p className="mt-1 text-lg font-semibold">{formatPrice(pkg.price)}</p>
      <dl className="price-split" data-testid="package-split">
        <div>
          <dt>
            {medicalLabel(pkg)}: paid on our secure booking page when you book {pkg.ivChoices.length ? "your IV" : "it"}
          </dt>
          <dd data-testid="split-online">
            {medical.varies ? "from " : ""}
            {formatPrice(medical.amount)}
          </dd>
        </div>
        <div>
          <dt>{extras.join(", ")}: paid at your visit</dt>
          <dd data-testid="split-visit">{formatPrice(atVisitPart(pkg))}</dd>
        </div>
        <div className="price-split-total">
          <dt>Package price</dt>
          <dd>{formatPrice(pkg.price)}</dd>
        </div>
      </dl>
      {pkg.ivChoices.length ? (
        <p className="mt-3 text-[0.9375rem]">
          You&apos;ll choose {pkg.ivChoices.map((c) => c.name).join(" or ")} on the secure booking page, subject
          to medical approval.
        </p>
      ) : null}
      {isMedical(pkg) ? <p className="mt-3 text-[0.9375rem]">{MEDICAL_CONSULTATION_LINE}</p> : null}
      {pkg.type === "iv" ? (
        <>
          <p className="mt-3 text-[0.9375rem] text-muted">
            Travel is included within a {settings.travelIncludedMinutes}-minute one-way drive from Shary&apos;s
            service starting location. {IV_TRAVEL_NOTE}
          </p>
          <p className="mt-2 text-[0.9375rem] text-muted" data-testid="iv-timing">
            <strong className="font-semibold">IV infusion time:</strong> {settings.ivInfusionTime}.{" "}
            <strong className="font-semibold">Total appointment time:</strong> {settings.ivAppointmentTime}
          </p>
        </>
      ) : null}
    </div>
  );
}
