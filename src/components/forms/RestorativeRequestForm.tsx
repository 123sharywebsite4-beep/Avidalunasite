"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { NO_MEDICAL_INFO_NOTE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { addToList } from "@/lib/mailchimp-signup";
import { enhancementPrice, restorativeItems, restorativeTotal } from "@/lib/packages";
import type { AddOn, WellnessPackage } from "@/lib/types";
import { fieldErrors, restorativeRequestSchema } from "@/lib/validation";
import { CheckboxField, FormError, Honeypot, TextField } from "./fields";
import { HONEYPOT, readForm, session, STORAGE, submitNetlifyForm } from "./submit";

type Choice = { value: string; name: string; detail: string; price: number; includes: string[] };

/**
 * Restorative-only visits (single services or Luna packages): no IV or injection, so no
 * Hydreight. The request goes to Shary through Netlify Forms ("restorative-request"), who
 * confirms the time by text or email. The person is also added to Mailchimp (SOURCE=restorative).
 * Pricing: one main choice (package price or standalone price), anything else at the
 * enhancement price, plus the travel fee once per appointment. Shown before they submit.
 */
export function RestorativeRequestForm({
  addOns,
  packages,
  travelFee,
  initial,
}: {
  addOns: AddOn[];
  packages: WellnessPackage[];
  travelFee: number;
  /** e.g. "package:luna-light" from /book?package=luna-light. */
  initial?: string;
}) {
  const items = addOns.filter((a) => !a.todo);
  const choices: Choice[] = [
      ...packages.map((p) => ({
        value: `package:${p.slug}`,
        name: p.name,
        detail: restorativeItems(p)
          .map((i) => (i.durationMinutes ? `${i.name}, ${i.durationMinutes} min` : i.name))
          .join(" + "),
        price: p.price,
        includes: p.includes.map((i) => i.id),
      })),
      ...items.map((a) => ({
        value: `item:${a.id.replace(/^addon-/, "")}`,
        name: a.name,
        detail: a.kind === "product" ? "Take-home product" : a.durationMinutes ? `${a.durationMinutes} minutes` : "Runs alongside your visit",
        price: a.price,
        includes: [a.id],
      })),
  ];
  const [selection, setSelection] = useState(choices.some((c) => c.value === initial) ? initial! : "");
  const [extras, setExtras] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  const main = choices.find((c) => c.value === selection) ?? null;
  // Enhancements on offer: only what the chosen package or service doesn't already include.
  const offered = items.filter((a) => !main?.includes.includes(a.id));
  const chosenExtras = offered.filter((a) => extras.includes(a.id));
  const totals = restorativeTotal(main, chosenExtras, travelFee);

  function choose(value: string) {
    setSelection(value);
    const next = choices.find((c) => c.value === value);
    setExtras((prev) => prev.filter((id) => !next?.includes.includes(id)));
  }

  function toggle(id: string, on: boolean) {
    setExtras((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const { str, bool } = readForm(e.currentTarget);
    const parsed = restorativeRequestSchema.safeParse({
      firstName: str("firstName"),
      lastName: str("lastName"),
      email: str("email"),
      phone: str("phone"),
      cityZip: str("cityZip"),
      selection,
      extras: chosenExtras.map((a) => a.id),
      preferred1: str("preferred1"),
      preferred2: str("preferred2"),
      preferred3: str("preferred3"),
      optIn: bool("optIn"),
    });
    if (!parsed.success || !main) {
      setErrors(parsed.success ? { selection: "Please choose a package or service." } : fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const d = parsed.data;
    const bot = Boolean(str(HONEYPOT));
    setPending(true);
    const ok = await submitNetlifyForm("restorative-request", {
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      cityZip: d.cityZip,
      selection: `${main.name}: ${formatPrice(main.price)}`,
      enhancements: chosenExtras.map((a) => `${a.name}: ${formatPrice(enhancementPrice(a))}`).join("\n"),
      travelFee: formatPrice(totals.travelFee),
      total: formatPrice(totals.total),
      preferred1: d.preferred1,
      preferred2: d.preferred2,
      preferred3: d.preferred3,
      optIn: d.optIn ? "yes" : "no",
      [HONEYPOT]: str(HONEYPOT),
    });
    setPending(false);
    if (!ok) {
      setFormError("Sorry, that didn't send. Please try again, or call or text Shary.");
      return;
    }
    session.set(STORAGE.email, d.email);
    session.set(STORAGE.firstName, d.firstName);
    session.set(STORAGE.lastName, d.lastName);
    if (!bot) {
      void addToList({ email: d.email, firstName: d.firstName, lastName: d.lastName, source: "restorative", optIn: d.optIn });
    }
    setSent(true);
    requestAnimationFrame(() => successRef.current?.focus());
  }

  if (sent) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="card mx-auto max-w-2xl p-6 outline-none md:p-8"
        data-testid="restorative-success"
      >
        <h2 className="text-3xl">Thanks! Shary will confirm your time by text or email.</h2>
        <p className="mt-3">
          Your total of {formatPrice(totals.total)} (including the {formatPrice(totals.travelFee)} travel fee) is paid at
          your visit.
        </p>
        <Link href="/" className="btn btn-outline mt-6">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Restorative visit request"
      className="card relative mx-auto max-w-2xl space-y-6 p-6 md:p-8"
      data-testid="restorative-form"
    >
      <div>
        <p className="eyebrow mb-2">RESTORATIVE VISIT · NO IV NEEDED</p>
        <h2 className="text-3xl">Request a restorative visit</h2>
        <p className="mt-2 text-[0.9375rem]">
          Red light, compression boots and aromatherapy, at your home or office. Choose what you&apos;d like and a few
          times that work, and Shary will confirm by text or email. Nothing is paid now.
        </p>
      </div>
      <Honeypot />

      <fieldset>
        <legend className="field-label">What would you like?</legend>
        <div className="choice-list mt-2">
          {choices.map((c) => (
            <label key={c.value}>
              <input
                type="radio"
                name="selection"
                value={c.value}
                checked={selection === c.value}
                onChange={() => choose(c.value)}
              />
              <span>
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-[0.875rem] text-muted">{c.detail}</span>
              </span>
              <span className="choice-price">{formatPrice(c.price)}</span>
            </label>
          ))}
        </div>
        {errors.selection ? (
          <p id="selection-error" className="field-error" role="alert">
            {errors.selection}
          </p>
        ) : null}
      </fieldset>

      {main && offered.length ? (
        <fieldset data-testid="restorative-enhancements">
          <legend className="field-label">
            Add an enhancement <span className="font-normal text-[#5a6150]">(optional)</span>
          </legend>
          <div className="choice-list mt-2">
            {offered.map((a) => (
              <label key={a.id}>
                <input
                  type="checkbox"
                  name="extras"
                  value={a.id}
                  checked={extras.includes(a.id)}
                  onChange={(e) => toggle(a.id, e.target.checked)}
                />
                <span>
                  <span className="block font-semibold">{a.name}</span>
                  <span className="block text-[0.875rem] text-muted">
                    Enhancement price ({formatPrice(a.price)} on its own)
                  </span>
                </span>
                <span className="choice-price">{formatPrice(enhancementPrice(a))}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="firstName" label="First name" required autoComplete="given-name" error={errors.firstName} />
        <TextField name="lastName" label="Last name" required autoComplete="family-name" error={errors.lastName} />
        <TextField
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          inputMode="email"
          error={errors.email}
        />
        <TextField name="phone" type="tel" label="Phone" required autoComplete="tel" inputMode="tel" error={errors.phone} />
      </div>
      <TextField
        name="cityZip"
        label="City or ZIP code"
        required
        autoComplete="postal-code"
        maxLength={80}
        error={errors.cityZip}
      />

      <fieldset>
        <legend className="field-label">Preferred dates and times</legend>
        <p className="field-hint">Give us two or three options. Shary confirms one with you.</p>
        <div className="mt-3 grid gap-5 sm:grid-cols-3">
          <TextField name="preferred1" type="datetime-local" label="First choice" required error={errors.preferred1} />
          <TextField name="preferred2" type="datetime-local" label="Second choice" required error={errors.preferred2} />
          <TextField name="preferred3" type="datetime-local" label="Third choice" error={errors.preferred3} />
        </div>
      </fieldset>

      <dl className="price-split" aria-live="polite" data-testid="restorative-total">
        <div>
          <dt>{main ? main.name : "Your choice"}</dt>
          <dd>{main ? formatPrice(main.price) : "—"}</dd>
        </div>
        {chosenExtras.map((a) => (
          <div key={a.id}>
            <dt>{a.name} (enhancement)</dt>
            <dd>{formatPrice(enhancementPrice(a))}</dd>
          </div>
        ))}
        <div>
          <dt>Travel fee (once per appointment)</dt>
          <dd data-testid="travel-fee">{formatPrice(travelFee)}</dd>
        </div>
        <div className="price-split-total">
          <dt>Total, paid at your visit</dt>
          <dd data-testid="restorative-grand-total">{main ? formatPrice(totals.total) : "—"}</dd>
        </div>
      </dl>

      <CheckboxField name="optIn" label="Yes, email me Avida Luna news and offers. Unsubscribe anytime." />
      <FormError message={formError} />
      <button type="submit" className="btn btn-primary w-full text-lg" disabled={pending}>
        {pending ? "Sending…" : "Send my request"}
      </button>
      <p className="text-[0.9375rem] text-[#5a6150]">
        {NO_MEDICAL_INFO_NOTE} Booking an IV or injection instead? <Link href="/book">Start here</Link>. See our{" "}
        <Link href="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}
