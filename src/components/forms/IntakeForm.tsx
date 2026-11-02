"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AddOnPicker } from "@/components/AddOnPicker";
import { ExternalIcon } from "@/components/Icons";
import { type BookingSettings, PackageSummary } from "@/components/PackageSummary";
import { NO_MEDICAL_INFO_NOTE } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { addToList } from "@/lib/mailchimp-signup";
import { availableEnhancements, medicalLabel, medicalPart } from "@/lib/packages";
import type { AddOn, WellnessPackage } from "@/lib/types";
import { fieldErrors, intakeSchema, joinSchema } from "@/lib/validation";
import {
  CheckboxField,
  FormError,
  Honeypot,
  SelectField,
  TextField,
} from "./fields";
import { HONEYPOT, readForm, session, STORAGE } from "./submit";

type Mode = "book" | "join";

/** /book steps: 1 details, 2 book on Hydreight, 3 add-ons (or "skipped" after "No thanks"). */
type Step = "details" | "book" | "addons" | "skipped";
const RESTORABLE: Step[] = ["book", "addons", "skipped"];
const STEP_INDEX: Record<Step, number> = { details: 0, book: 1, addons: 2, skipped: 2 };

const OPT_IN_LABEL =
  "Yes, email me Avida Luna news and offers. Unsubscribe anytime.";

/**
 * The intake form used on /book (opt-in optional) and /join (opt-in required).
 * First name, last name, email and an opt-in. Nothing else, and no health questions.
 * Both add the person to Shary's Mailchimp list from the browser (SOURCE booking or join).
 * On /book it then walks through step 2 (Hydreight, new tab) and step 3 (enhancements).
 * With a package (/book?package=<slug>), step 1 shows the package and its price split, and
 * step 3 offers only the enhancements the package doesn't already include.
 */
export function IntakeForm({
  mode,
  hydreightUrl,
  events = [],
  addOns = [],
  paymentsEnabled = false,
  pkg = null,
  settings,
}: {
  mode: Mode;
  hydreightUrl: string;
  events?: { slug: string; title: string }[];
  addOns?: AddOn[];
  paymentsEnabled?: boolean;
  /** The IV (or B12) package being booked, if any. */
  pkg?: WellnessPackage | null;
  settings?: BookingSettings;
}) {
  const enhancements = availableEnhancements(addOns, pkg);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [joined, setJoined] = useState(false);
  const [step, setStep] = useState<Step>("details");
  const [firstName, setFirstName] = useState("");
  const bookClicked = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  const done = mode === "book" ? step !== "details" : joined;

  const goTo = useCallback((next: Step) => {
    moved.current = true;
    setStep(next);
    session.set(STORAGE.step, next);
  }, []);

  // Move focus to the new step's card so screen readers and keyboards follow along.
  useEffect(() => {
    if (done && moved.current) {
      successRef.current?.focus();
      if (mode === "book") successRef.current?.scrollIntoView({ block: "start" });
    }
  }, [done, step, mode]);

  // On refresh, put them back on the step they were on (only for the same package, or none).
  useEffect(() => {
    if (mode !== "book") return;
    const saved = session.get(STORAGE.step) as Step | null;
    const name = session.get(STORAGE.firstName);
    const samePackage = (session.get(STORAGE.packageSlug) ?? "") === (pkg?.slug ?? "");
    bookClicked.current = session.get(STORAGE.bookClicked) === "1";
    if (saved && name && samePackage && RESTORABLE.includes(saved)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
      setFirstName(name);
      setStep(saved);
    }
  }, [mode, pkg?.slug]);

  // Coming back to this tab after "Book now" opened Hydreight means they're likely booked.
  useEffect(() => {
    if (mode !== "book" || step !== "book") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && bookClicked.current) goTo("addons");
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [mode, step, goTo]);

  function onBookClick() {
    bookClicked.current = true;
    session.set(STORAGE.bookClicked, "1");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const { str, bool } = readForm(e.currentTarget);
    const payload = {
      firstName: str("firstName"),
      lastName: str("lastName"),
      email: str("email"),
      optIn: bool("optIn"),
      ...(mode === "join" ? { eventSlug: str("eventSlug") } : {}),
    };

    const schema = mode === "join" ? joinSchema : intakeSchema;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    const d = parsed.data;
    // A filled honeypot means a bot: carry on as normal, but never add it to the list.
    const bot = Boolean(str(HONEYPOT));
    const contact = { email: d.email, firstName: d.firstName, lastName: d.lastName };

    if (mode === "book") {
      // Show the booking button right away. Everyone who asks for a booking link goes on
      // Shary's list (OPTIN says whether they ticked the box); her Mailchimp automation sends
      // the one booking-link note. A Mailchimp failure is logged and never blocks booking.
      session.set(STORAGE.email, d.email);
      session.set(STORAGE.firstName, d.firstName);
      session.set(STORAGE.lastName, d.lastName);
      session.set(STORAGE.packageSlug, pkg?.slug ?? "");
      setFirstName(d.firstName);
      bookClicked.current = false;
      session.set(STORAGE.bookClicked, "");
      goTo("book");
      if (!bot) void addToList({ ...contact, source: "booking", optIn: d.optIn });
      return;
    }

    const slug = "eventSlug" in d ? d.eventSlug : "";
    setPending(true);
    // Joining the list is the whole point of this form, so tell them if it didn't work.
    const saved = bot || (await addToList({ ...contact, source: slug ? `join:${slug}` : "join", optIn: true }));
    setPending(false);
    if (saved) {
      session.set(STORAGE.email, d.email);
      moved.current = true;
      setJoined(true);
    } else {
      setFormError("We couldn't add you right now. Please try again in a moment.");
    }
  }

  const progress =
    mode === "book" ? (
      <ol className="booking-progress" aria-label="Booking steps">
        {["Your details", "Services, time & screening", "Add-ons & visit"].map((label, i) => (
          <li
            key={label}
            aria-current={i === STEP_INDEX[step] ? "step" : undefined}
            data-complete={i < STEP_INDEX[step]}
          >
            <span aria-hidden>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
    ) : null;

  const bookHereLine = (
    <p className="text-[0.9375rem] text-[#5a6150]">
      Haven&apos;t picked a time yet?{" "}
      <a href={hydreightUrl} target="_blank" rel="noopener">
        Book here
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </p>
  );

  if (mode === "book" && step === "skipped") {
    return (
      <div className="mx-auto max-w-2xl">
        <div
          ref={successRef}
          tabIndex={-1}
          className="card p-6 outline-none md:p-8"
          data-testid="book-skipped"
        >
          {progress}
          <h2 className="text-3xl">You&apos;re all set, {firstName}.</h2>
          <p className="mt-3">
            See you at your visit. If you change your mind, you can add a
            ritual any time before your appointment.
          </p>
          <button
            type="button"
            className="btn btn-outline mt-6 w-full sm:w-auto"
            onClick={() => goTo("addons")}
          >
            Show me add-ons
          </button>
          <div className="mt-5">{bookHereLine}</div>
        </div>
      </div>
    );
  }

  if (mode === "book" && step === "addons") {
    return (
      <div className="booking-addons">
        <div
          ref={successRef}
          tabIndex={-1}
          className="card mx-auto mb-8 max-w-2xl scroll-mt-28 p-6 outline-none md:p-8"
          data-testid="book-addons"
        >
          {progress}
          <p className="eyebrow mb-3">{pkg ? "YOUR PACKAGE EXTRAS" : "OPTIONAL EXTRAS"}</p>
          <h2 className="text-3xl md:text-4xl">Booked? Make it a ritual.</h2>
          {pkg ? (
            <p className="mt-3">
              {firstName ? `${firstName}, confirm` : "Confirm"} the rest of your {pkg.name} package below, and add
              any enhancement you&apos;d like. You pay for these at your visit.
            </p>
          ) : (
            <p className="mt-3">
              {firstName ? `${firstName}, add` : "Add"} red light, compression boots or aromatherapy to your visit
              at enhancement prices, and pay Shary at your visit.
            </p>
          )}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            {pkg ? null : (
              <button
                type="button"
                className="btn btn-outline w-full sm:w-auto"
                onClick={() => goTo("skipped")}
              >
                No thanks, I&apos;m all set
              </button>
            )}
            {bookHereLine}
          </div>
        </div>
        <AddOnPicker
          addOns={enhancements}
          paymentsEnabled={pkg ? false : paymentsEnabled}
          formName="booking-extras"
          pkg={pkg}
        />
      </div>
    );
  }

  if (mode === "book" && step === "book") {
    return (
      <div className="mx-auto max-w-2xl">
      <div
        ref={successRef}
        tabIndex={-1}
        className="card p-6 outline-none md:p-8"
        data-testid="book-success"
      >
        {progress}
        <p className="eyebrow mb-4">YOUR BOOKING LINK</p>
        <h2 className="text-3xl">You&apos;re in, {firstName}.</h2>
        <p className="mt-3">
          Your booking link is ready. It opens our secure, HIPAA-compliant
          booking page in a new tab.
        </p>
        <a
          href={hydreightUrl}
          target="_blank"
          rel="noopener"
          className="btn btn-primary mt-6 w-full text-lg sm:w-auto"
          data-testid="hydreight-button"
          onClick={onBookClick}
        >
          Book now <ExternalIcon />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
        <p className="mt-4 text-[0.9375rem]">
          If it didn&apos;t open, use this link:{" "}
          <a
            href={hydreightUrl}
            target="_blank"
            rel="noopener"
            className="break-all"
            onClick={onBookClick}
          >
            Open the secure booking page
          </a>
        </p>
        <button
          type="button"
          className="btn btn-outline mt-5 w-full sm:w-auto"
          onClick={() => goTo("addons")}
          data-testid="booked-button"
        >
          {pkg ? "I've booked, confirm my package" : "I've booked, show me add-ons"}
        </button>
        <div className="mt-6 border-t border-olive/15 pt-5">
          <p className="eyebrow mb-3">WHAT HAPPENS NEXT</p>
          <ol className="list-decimal space-y-1 pl-5">
            {pkg ? (
              <li>
                Book your {medicalLabel(pkg)} and a time on the booking page (
                {formatPrice(medicalPart(pkg).amount)}).
              </li>
            ) : (
              <li>Pick your services and a time on the booking page.</li>
            )}
            <li>
              Complete a quick, secure health screening and pay for your{" "}
              {pkg?.type === "injection" ? "injection" : "IV"} there.
            </li>
            <li>
              {pkg
                ? `Then come back to this tab to confirm the rest of your ${pkg.name} package, paid at your visit.`
                : "Then come back to this tab and make it a ritual with an optional enhancement, like red light or compression boots. Pay at your visit."}
            </li>
          </ol>
        </div>
      </div>
      </div>
    );
  }

  if (done && mode === "join") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="card p-6 outline-none md:p-8"
        data-testid="join-success"
      >
        <h2 className="text-3xl">You&apos;re on the list.</h2>
        <p className="mt-3">
          Thanks for joining. Watch your inbox for your free copy of Wellness
          Notes from a Nurse.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/book" className="btn btn-primary">
            Book an appointment
          </Link>
          <Link href="/" className="btn btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={`card relative space-y-5 p-6 md:p-8 ${mode === "book" ? "mx-auto max-w-2xl" : ""}`}
    >
      {progress}
      {pkg && settings ? <PackageSummary pkg={pkg} settings={settings} /> : null}
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          name="firstName"
          label="First name"
          required
          autoComplete="given-name"
          error={errors.firstName}
        />
        <TextField
          name="lastName"
          label="Last name"
          required
          autoComplete="family-name"
          error={errors.lastName}
        />
      </div>
      <TextField
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        inputMode="email"
        hint={mode === "book" ? "We'll email your booking link and visit details." : undefined}
        error={errors.email}
      />
      {mode === "join" && events.length ? (
        <SelectField
          name="eventSlug"
          label="Which event?"
          placeholder="Not sure / no event"
          options={events.map((e) => ({ value: e.slug, label: e.title }))}
          error={errors.eventSlug}
        />
      ) : null}
      <CheckboxField
        name="optIn"
        label={
          mode === "join"
            ? "Yes, email me Wellness Notes from a Nurse and Avida Luna news and offers. Unsubscribe anytime."
            : OPT_IN_LABEL
        }
        required={mode === "join"}
        error={errors.optIn}
      />
      <FormError message={formError} />
      <button
        type="submit"
        className="btn btn-primary w-full text-lg"
        disabled={pending}
      >
        {mode === "book" ? "Get my booking link" : pending ? "Sending…" : "Send me my free copy"}
      </button>
      <p className="text-[0.9375rem] text-[#5a6150]">
        {mode === "book"
          ? "You'll get your booking link right away. Ticking the box is optional and doesn't affect your booking. "
          : null}
        {NO_MEDICAL_INFO_NOTE} Health screening happens privately on our secure
        booking page.{" "}
        {mode === "book"
          ? "Besides one note with your booking link, we only email you if you tick the box."
          : "We only email you if you tick the box."}{" "}
        See our{" "}
        <Link href="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}
