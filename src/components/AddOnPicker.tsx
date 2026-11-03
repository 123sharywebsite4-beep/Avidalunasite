"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDuration, formatPrice } from "@/lib/format";
import { atVisitPart, enhancementPrice, restorativeItems } from "@/lib/packages";
import type { AddOn, WellnessPackage } from "@/lib/types";
import { PhotoSlot } from "./Portrait";
import { atVisitSchema, bookingExtrasSchema, fieldErrors } from "@/lib/validation";
import { FormError, Honeypot, TextField } from "./forms/fields";
import { HONEYPOT, postJson, readForm, safeSession, session, STORAGE, submitNetlifyForm } from "./forms/submit";
import { CheckIcon, MinusIcon, PlusIcon } from "./Icons";

const MAX = 10;

type Selection = Record<string, number>;

function loadSelection(validIds: Set<string>): Selection {
  try {
    const raw = safeSession()?.getItem(STORAGE.selection);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Selection;
    const out: Selection = {};
    for (const [id, q] of Object.entries(parsed)) {
      if (validIds.has(id) && Number.isInteger(q) && q > 0)
        out[id] = Math.min(MAX, q);
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Enhancements for an appointment that's already booked, at enhancement prices.
 * "Pay at my visit" emails Shary through Netlify Forms: "add-ons-at-visit" from /add-ons,
 * "booking-extras" from /book step 3 (which also carries the package's at-visit part).
 * Nothing about health, and never which IV was chosen.
 */
export function AddOnPicker({
  addOns,
  paymentsEnabled,
  formName = "add-ons-at-visit",
  pkg = null,
}: {
  addOns: AddOn[];
  paymentsEnabled: boolean;
  formName?: "add-ons-at-visit" | "booking-extras";
  /** The package being booked: its restorative part is paid at the visit too. */
  pkg?: WellnessPackage | null;
}) {
  const extras = formName === "booking-extras";
  const packageDue = pkg ? atVisitPart(pkg) : 0;
  const [qty, setQty] = useState<Selection>({});
  const [restored, setRestored] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [contact, setContact] = useState({ firstName: "", lastName: "", email: "" });
  const [visitErrors, setVisitErrors] = useState<Record<string, string>>({});
  const [visitError, setVisitError] = useState<string | null>(null);
  const [visitPending, setVisitPending] = useState(false);
  const [visitSent, setVisitSent] = useState(false);

  // Restore the last selection (e.g. after cancelling checkout).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
    setQty(loadSelection(new Set(addOns.map((a) => a.id))));
    setRestored(true);
  }, [addOns]);

  useEffect(() => {
    if (restored)
      safeSession()?.setItem(STORAGE.selection, JSON.stringify(qty));
  }, [qty, restored]);

  const { count, total } = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const a of addOns) {
      const q = qty[a.id] ?? 0;
      count += q;
      total += q * enhancementPrice(a);
    }
    return { count, total };
  }, [qty, addOns]);

  function change(id: string, delta: number) {
    setError(null);
    setQty((prev) => {
      const next = Math.max(0, Math.min(MAX, (prev[id] ?? 0) + delta));
      const copy = { ...prev };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function pay() {
    if (count === 0 || pending) return;
    setPending(true);
    setError(null);
    const items = Object.entries(qty).map(([id, quantity]) => ({
      id,
      quantity,
    }));
    const email = session.get(STORAGE.email) ?? "";
    const result = (await postJson("/api/checkout", { items, email })) as
      { ok: true; url?: string } | { ok: false; error: string };
    if (result.ok && "url" in result && result.url) {
      window.location.assign(result.url);
      return;
    }
    setPending(false);
    setError(
      result.ok
        ? "We couldn't start checkout. Please try again."
        : result.error,
    );
  }

  const canConfirm = count > 0 || Boolean(pkg);
  const dueAtVisit = packageDue + total;

  function openAtVisit() {
    if (!canConfirm) return;
    const session = safeSession();
    setContact({
      firstName: session?.getItem(STORAGE.firstName) ?? "",
      lastName: session?.getItem(STORAGE.lastName) ?? "",
      email: session?.getItem(STORAGE.email) ?? "",
    });
    setVisitErrors({});
    setVisitError(null);
    setVisitSent(false);
    dialog.current?.showModal();
  }

  // Sent to Netlify Forms as "add-ons-at-visit", which emails Shary what to bring.
  // Nothing is charged, so the prices here are the ones shown on the page.
  async function sendAtVisit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (visitPending) return;
    const { str } = readForm(e.currentTarget);
    const input = {
      items: Object.entries(qty).map(([id, quantity]) => ({ id, quantity })),
      firstName: str("firstName"),
      email: str("email"),
    };
    const parsed = extras
      ? bookingExtrasSchema.safeParse({ ...input, lastName: str("lastName") })
      : atVisitSchema.safeParse(input);
    if (!parsed.success) {
      setVisitErrors(fieldErrors(parsed.error));
      return;
    }
    setVisitErrors({});
    setVisitError(null);
    const chosen = addOns.filter((a) => qty[a.id]);
    const lines = chosen.map(
      (a) => `${a.name} × ${qty[a.id]}: ${formatPrice(enhancementPrice(a) * qty[a.id])}`,
    );
    setVisitPending(true);
    const lastName = "lastName" in parsed.data ? String(parsed.data.lastName) : "";
    const sent = extras
      ? await submitNetlifyForm("booking-extras", {
          name: `${parsed.data.firstName} ${lastName}`.trim(),
          email: parsed.data.email,
          package: pkg?.name ?? "None",
          // Only the non-medical items. Never the IV or injection, and never which IV was chosen.
          items: [
            ...(pkg
              ? [`${pkg.name} (package, at visit): ${restorativeItems(pkg).map((i) => i.name).join(", ")}: ${formatPrice(packageDue)}`]
              : []),
            ...lines.map((l) => `Enhancement: ${l}`),
          ].join("\n"),
          dueAtVisit: formatPrice(dueAtVisit),
          [HONEYPOT]: str(HONEYPOT),
        })
      : await submitNetlifyForm("add-ons-at-visit", {
          firstName: parsed.data.firstName,
          email: parsed.data.email,
          addOns: lines.join("\n"),
          total: formatPrice(total),
          [HONEYPOT]: str(HONEYPOT),
        });
    setVisitPending(false);
    if (sent) {
      session.set(STORAGE.email, parsed.data.email);
      session.set(STORAGE.firstName, parsed.data.firstName);
      if (lastName) session.set(STORAGE.lastName, lastName);
      setVisitSent(true);
      setQty({});
    } else {
      setVisitError("Sorry, that didn't send. Please try again, or just tell Shary at your visit.");
    }
  }

  const enhancementText = `${count} ${count === 1 ? "enhancement" : "enhancements"}`;
  const summaryText = pkg
    ? `${pkg.name} extras + ${enhancementText} · ${formatPrice(dueAtVisit)} at your visit`
    : `${enhancementText} · ${formatPrice(total)}`;

  const atVisitButton = (
    <button
      type="button"
      className="btn btn-primary w-full"
      onClick={openAtVisit}
      disabled={!canConfirm}
      aria-describedby="addon-summary"
    >
      Pay at my visit
    </button>
  );

  const payButton = paymentsEnabled ? (
    <button
      type="button"
      className="btn btn-outline w-full"
      onClick={pay}
      disabled={count === 0 || pending}
      aria-describedby="addon-summary"
    >
      {pending ? "Opening checkout…" : "Pay now by card"}
    </button>
  ) : (
    <p
      className="rounded-xl bg-sage/50 px-4 py-3 text-[0.9375rem]"
      data-testid="payments-off"
    >
      Online payment coming soon. Pay for these at your visit.
    </p>
  );

  return (
    <div className="addon-layout grid gap-8 lg:grid-cols-[1fr_20rem] lg:items-start">
      <ul className="addon-list" aria-label="Enhancements">
        {addOns.map((a) => {
          const q = qty[a.id] ?? 0;
          const duration = formatDuration(a.durationMinutes);
          return (
            <li
              key={a.id}
              className="card flex flex-col overflow-hidden"
              data-testid={`addon-${a.id}`}
            >
              {a.image ? (
                <div className="addon-image">
                  <PhotoSlot
                    image={a.image}
                    label={a.name}
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                  />
                </div>
              ) : null}
              <div className="addon-item-body flex flex-1 flex-col p-5">
                <h2 className="text-2xl">{a.name}</h2>
                <p className="mt-1 text-[0.9375rem] font-semibold">
                  {[duration, formatPrice(enhancementPrice(a))].filter(Boolean).join(" · ")}
                  {enhancementPrice(a) < a.price ? (
                    <span className="font-normal text-muted"> (enhancement price; {formatPrice(a.price)} on its own)</span>
                  ) : null}
                </p>
                <p className="mt-2 flex-1">{a.description}</p>
                <div
                  className="mt-4 flex items-center gap-3"
                  role="group"
                  aria-label={`${a.name} quantity`}
                >
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-md border-[1.5px] border-olive text-olive-dark disabled:opacity-40"
                    onClick={() => change(a.id, -1)}
                    disabled={q === 0}
                    aria-label={`Remove one ${a.name}`}
                  >
                    <MinusIcon />
                  </button>
                  <output
                    className="w-8 text-center text-lg font-semibold"
                    aria-live="polite"
                    aria-label={`${a.name}: ${q}`}
                  >
                    {q}
                  </output>
                  <button
                    type="button"
                    className="grid size-11 place-items-center rounded-md border-[1.5px] border-olive text-olive-dark disabled:opacity-40"
                    onClick={() => change(a.id, 1)}
                    disabled={q >= MAX}
                    aria-label={`Add one ${a.name}`}
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop summary card */}
      <aside
        className="card sticky top-28 hidden p-6 lg:block"
        aria-label="Your selection"
      >
        <p className="eyebrow mb-3">YOUR SELECTION</p>
        <h2 className="text-2xl">{pkg ? "Paid at your visit" : "Your enhancements"}</h2>
        {pkg ? (
          <p className="mt-3 flex justify-between gap-3" data-testid="package-at-visit">
            <span>
              {pkg.name}: {restorativeItems(pkg).map((i) => i.name).join(", ")}
            </span>
            <span>{formatPrice(packageDue)}</span>
          </p>
        ) : null}
        {count === 0 ? (
          pkg ? null : (
            <p className="mt-3">
              Nothing added yet. Choose an optional enhancement to see your total.
            </p>
          )
        ) : (
          <ul className="mt-3 space-y-1">
            {addOns
              .filter((a) => qty[a.id])
              .map((a) => (
                <li key={a.id} className="flex justify-between gap-3">
                  <span>
                    {a.name} × {qty[a.id]}
                  </span>
                  <span>{formatPrice(enhancementPrice(a) * (qty[a.id] ?? 0))}</span>
                </li>
              ))}
          </ul>
        )}
        <p
          id="addon-summary"
          className="mt-4 border-t border-olive/15 pt-4 font-semibold"
          aria-live="polite"
        >
          {summaryText}
        </p>
        <div className="mt-4 space-y-3">
          {atVisitButton}
          {payButton}
        </div>
        <p className="mt-3 text-[0.9375rem] text-muted">
          At your visit, Shary takes tap-to-pay or card.
        </p>
        <div className="mt-3">
          <FormError message={error} />
        </div>
      </aside>

      {/* Mobile sticky summary bar */}
      <div aria-hidden className="h-24 lg:hidden" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-olive/15 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          {error ? (
            <div className="mb-2">
              <FormError message={error} />
            </div>
          ) : null}
          <p className="mb-2 font-semibold" aria-hidden>
            {summaryText}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">{atVisitButton}</div>
            <div className="flex-1">{payButton}</div>
          </div>
        </div>
      </div>

      <dialog
        ref={dialog}
        className="addon-dialog card p-6 md:p-8"
        aria-labelledby="at-visit-heading"
        data-testid="at-visit-dialog"
      >
        {visitSent ? (
          <div>
            <span className="grid size-12 place-items-center rounded-full bg-sage text-ink">
              <CheckIcon className="size-6" />
            </span>
            <h2 id="at-visit-heading" className="mt-4 text-3xl">
              You&apos;re all set.
            </h2>
            <p className="mt-2">
              Shary will bring {pkg ? "everything for your package" : "your enhancements"} to your
              appointment. Pay at your visit by tapping your card or phone.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-6 w-full"
              onClick={() => dialog.current?.close()}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={sendAtVisit} noValidate className="space-y-5">
            <div>
              <p className="eyebrow mb-3">PAY AT MY VISIT</p>
              <h2 id="at-visit-heading" className="text-3xl">
                Who should Shary bring these for?
              </h2>
              <p className="mt-2 text-[0.9375rem]">
                {summaryText}. Use the same email you booked with. Nothing is
                charged now.
              </p>
              <p className="mt-2 text-[0.9375rem] text-muted">
                Please don&apos;t include medical information here.
              </p>
            </div>
            <Honeypot />
            <TextField
              key={`n-${contact.firstName}`}
              name="firstName"
              label="First name"
              required
              autoComplete="given-name"
              defaultValue={contact.firstName}
              error={visitErrors.firstName}
            />
            {extras ? (
              <TextField
                key={`l-${contact.lastName}`}
                name="lastName"
                label="Last name"
                required
                autoComplete="family-name"
                defaultValue={contact.lastName}
                error={visitErrors.lastName}
              />
            ) : null}
            <TextField
              key={`e-${contact.email}`}
              name="email"
              type="email"
              label="Email"
              required
              autoComplete="email"
              inputMode="email"
              defaultValue={contact.email}
              error={visitErrors.email}
            />
            <FormError message={visitError} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={visitPending}
              >
                {visitPending ? "Sending…" : pkg ? "Confirm my package" : "Confirm enhancements"}
              </button>
              <button
                type="button"
                className="btn btn-outline flex-1"
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  );
}
