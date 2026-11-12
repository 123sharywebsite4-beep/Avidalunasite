"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NO_MEDICAL_INFO_NOTE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { addToList } from "@/lib/mailchimp-signup";
import {
  BOOKING_DATE_RULES,
  bookingWindow,
  formatPreferredTime,
  newReference,
  offeredEnhancements,
  quoteRestorative,
  REFERENCE_PATTERN,
  restorativeChoices,
} from "@/lib/restorative";
import type { AddOn, WellnessPackage } from "@/lib/types";
import { fieldErrors, restorativeRequestSchema } from "@/lib/validation";
import { CheckboxField, FormError, Honeypot, TextField } from "./fields";
import { HONEYPOT, readForm, session, STORAGE, submitNetlifyForm } from "./submit";

/** Everything typed into the form, saved before the redirect to Stripe so the cancel page can restore it. */
export type RestorativeDraft = {
  selection: string;
  extras: string[];
  preferredTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cityZip: string;
  optIn: boolean;
  reference: string;
};

export function readRestorativeDraft(): RestorativeDraft | null {
  try {
    const raw = session.get(STORAGE.restorativeDraft);
    const draft = raw ? (JSON.parse(raw) as RestorativeDraft) : null;
    return draft && typeof draft.selection === "string" && REFERENCE_PATTERN.test(draft.reference) ? draft : null;
  } catch {
    return null;
  }
}

/** What the "payment" field tells Shary in the form email. */
const PAYMENT_NOTE = {
  online: "Paying online by card (Stripe). Only paid once a Stripe payment with this reference shows.",
  atVisit: "Pay at visit",
  atVisitAfterCancel: "Pay at visit (online checkout was cancelled)",
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Restorative-only visits (single services or Luna packages): no IV or injection, so no Hydreight.
 * One main choice (package price or standalone price), enhancements at the enhancement price, plus
 * the travel fee once per appointment, all shown before they continue (src/lib/restorative.ts).
 *
 * With online payment on: the details go to Shary through Netlify Forms ("restorative-request")
 * first, then the person pays on Stripe's page. Both carry the same booking reference.
 * With it off (no Stripe keys), it's a request paid at the visit, as before.
 * Either way Shary confirms the time by text or email, and the person joins Mailchimp (SOURCE=restorative).
 */
export function RestorativeRequestForm({
  addOns,
  packages,
  travelFee,
  paymentsEnabled,
  initial,
  draft,
}: {
  addOns: AddOn[];
  packages: WellnessPackage[];
  travelFee: number;
  paymentsEnabled: boolean;
  /** e.g. "package:luna-light" from /book/restorative?package=luna-light. */
  initial?: string;
  /** After a cancelled checkout: the saved form, restored. Also offers "pay at my visit". */
  draft?: RestorativeDraft | null;
}) {
  const catalog = { packages, addOns, travelFee };
  const choices = restorativeChoices(packages, addOns);
  const start = draft?.selection ?? initial;
  const [selection, setSelection] = useState(choices.some((c) => c.value === start) ? start! : "");
  const [extras, setExtras] = useState<string[]>(draft?.extras ?? []);
  const [online, setOnline] = useState(paymentsEnabled);
  const [dateWindow, setDateWindow] = useState<{ min: string; max: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<{ reference: string; total: number; travelFee: number } | null>(null);
  const reference = useRef(draft?.reference ?? "");
  const successRef = useRef<HTMLDivElement>(null);

  // The date field's limits depend on the current time, so they're set in the browser after load
  // (the page itself is static). The same limits are checked again when the form is sent.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the current time is only known in the browser
    setDateWindow(bookingWindow());
  }, []);

  const main = choices.find((c) => c.value === selection) ?? null;
  const offered = offeredEnhancements(main, addOns);
  const chosenExtras = offered.filter((a) => extras.includes(a.id));
  const quoted = main ? quoteRestorative({ selection, extras: chosenExtras.map((a) => a.id) }, catalog) : null;
  const quote = quoted?.ok ? quoted.quote : null;

  function choose(value: string) {
    setSelection(value);
    const next = choices.find((c) => c.value === value);
    setExtras((prev) => prev.filter((id) => !next?.includes.includes(id)));
  }

  function toggle(id: string, on: boolean) {
    setExtras((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  }

  async function send(form: HTMLFormElement, payAtVisit: boolean) {
    if (pending) return;
    setFormError(null);
    const { str, bool } = readForm(form);
    const parsed = restorativeRequestSchema.safeParse({
      firstName: str("firstName"),
      lastName: str("lastName"),
      email: str("email"),
      phone: str("phone"),
      cityZip: str("cityZip"),
      selection,
      extras: chosenExtras.map((a) => a.id),
      preferredTime: str("preferredTime"),
      optIn: bool("optIn"),
    });
    if (!parsed.success || !main || !quote) {
      setErrors(parsed.success ? { selection: "Please choose a package or service." } : fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const d = parsed.data;
    const bot = Boolean(str(HONEYPOT));
    reference.current ||= newReference();
    const payOnline = online && !payAtVisit && !bot;

    const details = (payment: string, ref: string) => ({
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      cityZip: d.cityZip,
      selection: `${main.name}: ${formatPrice(main.price)}`,
      enhancements: quote.extras.map((x) => `${x.addOn.name}: ${formatPrice(x.price)}`).join("\n"),
      travelFee: formatPrice(quote.travelFee),
      total: formatPrice(quote.total),
      preferredTime: formatPreferredTime(d.preferredTime),
      payment,
      reference: ref,
      optIn: d.optIn ? "yes" : "no",
      [HONEYPOT]: str(HONEYPOT),
    });
    const joinList = () =>
      addToList({ email: d.email, firstName: d.firstName, lastName: d.lastName, source: "restorative", optIn: d.optIn });

    setPending(true);

    if (payOnline) {
      // 1. Price it on the server and open a Stripe checkout (nothing is charged yet).
      let res: Response | null = null;
      let data: { ok?: boolean; url?: string; reference?: string; error?: string } | null = null;
      try {
        res = await fetch("/api/restorative-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selection,
            extras: chosenExtras.map((a) => a.id),
            preferredTime: d.preferredTime,
            email: d.email,
            reference: reference.current,
            shownTotalCents: quote.totalCents,
          }),
        });
        data = await res.json().catch(() => null);
      } catch {
        // Network error: handled below.
      }
      if (res?.status === 503) {
        // Payments were switched off after this page was built: fall back to a request.
        setOnline(false);
        setPending(false);
        setNotice("Online payment isn't available right now. Send your request and pay at your visit instead.");
        return;
      }
      if (!res?.ok || !data?.ok || !data.url || !data.reference) {
        setPending(false);
        setFormError(data?.error ?? "We couldn't start checkout. Please try again, or call or text Shary.");
        return;
      }
      reference.current = data.reference;

      // 2. Send Shary the booking details first, so a payment never arrives without them.
      session.set(
        STORAGE.restorativeDraft,
        JSON.stringify({ ...d, reference: data.reference } satisfies RestorativeDraft),
      );
      const sentToShary = await submitNetlifyForm("restorative-request", details(PAYMENT_NOTE.online, data.reference));
      if (!sentToShary) {
        setPending(false);
        setFormError("Sorry, that didn't send, and nothing was charged. Please try again, or call or text Shary.");
        return;
      }
      session.set(STORAGE.email, d.email);
      session.set(STORAGE.firstName, d.firstName);
      session.set(STORAGE.lastName, d.lastName);
      // 3. Mailchimp (give it a moment before leaving the page), then Stripe's payment page.
      await Promise.race([joinList(), wait(1500)]);
      window.location.assign(data.url);
      return;
    }

    const ok = await submitNetlifyForm(
      "restorative-request",
      details(draft ? PAYMENT_NOTE.atVisitAfterCancel : PAYMENT_NOTE.atVisit, reference.current),
    );
    setPending(false);
    if (!ok) {
      setFormError("Sorry, that didn't send. Please try again, or call or text Shary.");
      return;
    }
    session.remove(STORAGE.restorativeDraft);
    session.set(STORAGE.email, d.email);
    session.set(STORAGE.firstName, d.firstName);
    session.set(STORAGE.lastName, d.lastName);
    if (!bot) void joinList();
    setSent({ reference: reference.current, total: quote.total, travelFee: quote.travelFee });
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
          Your total of {formatPrice(sent.total)} (including the {formatPrice(sent.travelFee)} travel fee) is paid at
          your visit.
        </p>
        <p className="mt-2">
          Your booking reference is <strong data-testid="restorative-reference">{sent.reference}</strong>.
        </p>
        <Link href="/" className="btn btn-outline mt-6">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void send(e.currentTarget, false);
      }}
      noValidate
      aria-label="Book a restorative visit"
      className="card relative mx-auto max-w-2xl space-y-6 p-6 md:p-8"
      data-testid="restorative-form"
    >
      <div>
        <p className="eyebrow mb-2">NON-MEDICAL · NO IV NEEDED</p>
        <h2 className="text-3xl">Choose your visit</h2>
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
                <span className="choice-price">{formatPrice(a.enhancementPrice ?? a.price)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="firstName"
          label="First name"
          required
          autoComplete="given-name"
          defaultValue={draft?.firstName}
          error={errors.firstName}
        />
        <TextField
          name="lastName"
          label="Last name"
          required
          autoComplete="family-name"
          defaultValue={draft?.lastName}
          error={errors.lastName}
        />
        <TextField
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          inputMode="email"
          defaultValue={draft?.email}
          error={errors.email}
        />
        <TextField
          name="phone"
          type="tel"
          label="Phone"
          required
          autoComplete="tel"
          inputMode="tel"
          defaultValue={draft?.phone}
          error={errors.phone}
        />
      </div>
      <TextField
        name="cityZip"
        label="City or ZIP code"
        required
        autoComplete="postal-code"
        maxLength={80}
        defaultValue={draft?.cityZip}
        error={errors.cityZip}
      />
      <TextField
        name="preferredTime"
        type="datetime-local"
        label="Preferred date and time"
        required
        hint={`Florida time. At least ${BOOKING_DATE_RULES.minHoursAhead} hours from now and within the next ${BOOKING_DATE_RULES.maxDaysAhead} days.`}
        min={dateWindow?.min}
        max={dateWindow?.max}
        defaultValue={draft?.preferredTime}
        error={errors.preferredTime}
      />

      <dl className="price-split" aria-live="polite" data-testid="restorative-total">
        <div>
          <dt>{main ? main.name : "Your choice"}</dt>
          <dd>{main ? formatPrice(main.price) : "—"}</dd>
        </div>
        {quote?.extras.map((x) => (
          <div key={x.addOn.id}>
            <dt>{x.addOn.name} (enhancement)</dt>
            <dd>{formatPrice(x.price)}</dd>
          </div>
        ))}
        <div>
          <dt>Travel fee (once per appointment)</dt>
          <dd data-testid="travel-fee">{formatPrice(travelFee)}</dd>
        </div>
        <div className="price-split-total">
          <dt>{online ? "Total, paid online now" : "Total, paid at your visit"}</dt>
          <dd data-testid="restorative-grand-total">{quote ? formatPrice(quote.total) : "—"}</dd>
        </div>
      </dl>

      <CheckboxField
        name="optIn"
        label="Yes, email me Avida Luna news and offers. Unsubscribe anytime."
        defaultChecked={draft?.optIn}
      />
      {notice ? (
        <p role="status" className="rounded-lg border border-line bg-cream px-4 py-3" data-testid="payments-off-notice">
          {notice}
        </p>
      ) : null}
      <FormError message={formError} />
      {online ? (
        // TODO (Shary): the full cancellation and refund policy, for the Terms and the FAQ ("faq-cancel").
        <p className="text-[0.9375rem]" data-testid="refund-note">
          Your date and time are a request until Shary confirms by text or email. If she can&apos;t make it and no other
          time works for you, you&apos;ll get a full refund.
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full text-lg" disabled={pending}>
        {online ? (pending ? "Opening secure checkout…" : "Continue to payment") : pending ? "Sending…" : "Send my request"}
      </button>
      {online && draft ? (
        <button
          type="button"
          className="btn btn-outline w-full"
          disabled={pending}
          onClick={(e) => e.currentTarget.form && void send(e.currentTarget.form, true)}
        >
          Send as a request and pay at my visit
        </button>
      ) : null}
      <p className="text-[0.9375rem] text-[#5a6150]">
        {NO_MEDICAL_INFO_NOTE} Booking an IV or injection instead? <Link href="/book">Start here</Link>. See our{" "}
        <Link href="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}
