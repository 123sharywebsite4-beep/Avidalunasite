"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "@/components/Icons";
import { addToList } from "@/lib/mailchimp-signup";
import { fieldErrors, leadMagnetSchema } from "@/lib/validation";
import { FormError, Honeypot, TextField } from "./fields";
import { HONEYPOT, readForm } from "./submit";

/**
 * Free-guide signup. Adds the person to Shary's Mailchimp list from the browser with
 * SOURCE "lead-magnet"; Shary sends the guide herself from Mailchimp. Nothing else is stored.
 */
export function LeadMagnetForm({ buttonLabel, successMessage }: { buttonLabel: string; successMessage: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const doneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setFormError(null);
    const { str } = readForm(e.currentTarget);
    const parsed = leadMagnetSchema.safeParse({
      firstName: str("firstName"),
      lastName: str("lastName"),
      email: str("email"),
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    // A filled honeypot means a bot: show success, but never add it to the list.
    const bot = Boolean(str(HONEYPOT));
    setPending(true);
    // Asking for the guide is asking to join the list (the note under the button says so),
    // so OPTIN is "yes", as on /join.
    const saved = bot || (await addToList({ ...parsed.data, source: "lead-magnet", optIn: true }));
    setPending(false);
    if (saved) setDone(true);
    else setFormError("We couldn't sign you up right now. Please try again in a moment.");
  }

  if (done) {
    return (
      <div
        ref={doneRef}
        tabIndex={-1}
        role="status"
        className="lead-magnet-success outline-none"
        data-testid="lead-magnet-success"
      >
        {successMessage}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative space-y-5"
      aria-label="Free guide signup"
      aria-busy={pending}
    >
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="firstName" label="First name" required autoComplete="given-name" error={errors.firstName} />
        <TextField name="lastName" label="Last name" required autoComplete="family-name" error={errors.lastName} />
      </div>
      <TextField
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        inputMode="email"
        error={errors.email}
      />
      <FormError message={formError} />
      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={pending}>
        {pending ? "Sending…" : buttonLabel} <ArrowRightIcon />
      </button>
      <p className="text-[13px] text-[#53604f]">
        You&apos;ll also get occasional Avida Luna news and offers. Unsubscribe anytime. See our{" "}
        <Link href="/privacy">privacy notice</Link>.
      </p>
    </form>
  );
}
