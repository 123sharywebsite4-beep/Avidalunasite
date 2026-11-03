"use client";

import { useId, useState } from "react";
import { NO_MEDICAL_INFO_NOTE } from "@/lib/constants";
import { HONEYPOT } from "./submit";

type Common = {
  name: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
};

function describedBy(id: string, hint?: string, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

function Label({ id, label, required }: { id: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={id} className="field-label">
      {label}
      {required ? null : <span className="font-normal text-[#5a6150]"> (optional)</span>}
    </label>
  );
}

function Messages({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return (
    <>
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}

export function TextField({
  type = "text",
  autoComplete,
  inputMode,
  max,
  min,
  maxLength = 120,
  defaultValue,
  ...p
}: Common & {
  type?: "text" | "email" | "tel" | "date" | "datetime-local";
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  max?: string;
  min?: string;
  maxLength?: number;
  defaultValue?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label id={id} label={p.label} required={p.required} />
      <input
        id={id}
        name={p.name}
        type={type}
        required={p.required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        defaultValue={defaultValue}
        min={min}
        max={max}
        className="field-input"
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(id, p.hint, p.error)}
      />
      <Messages id={id} hint={p.hint} error={p.error} />
    </div>
  );
}

export function SelectField({
  options,
  placeholder = "Choose one",
  ...p
}: Common & { options: readonly { value: string; label: string }[]; placeholder?: string }) {
  const id = useId();
  return (
    <div>
      <Label id={id} label={p.label} required={p.required} />
      <select
        id={id}
        name={p.name}
        required={p.required}
        defaultValue=""
        className="field-input appearance-auto"
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(id, p.hint, p.error)}
      >
        <option value="" disabled={p.required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Messages id={id} hint={p.hint} error={p.error} />
    </div>
  );
}

/** Every free-text box carries the no-medical-information line. */
export function TextAreaField({ maxLength = 1000, ...p }: Common & { maxLength?: number }) {
  const id = useId();
  const [count, setCount] = useState(0);
  const hint = `${NO_MEDICAL_INFO_NOTE} ${count}/${maxLength}`;
  return (
    <div>
      <Label id={id} label={p.label} required={p.required} />
      <textarea
        id={id}
        name={p.name}
        required={p.required}
        maxLength={maxLength}
        rows={4}
        className="field-input min-h-28"
        onChange={(e) => setCount(e.target.value.length)}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={describedBy(id, hint, p.error)}
      />
      <p id={`${id}-hint`} className="field-hint">
        <strong className="font-semibold">{NO_MEDICAL_INFO_NOTE}</strong>{" "}
        <span aria-hidden>
          {count}/{maxLength}
        </span>
      </p>
      {p.error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {p.error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({ name, label, required, error }: Omit<Common, "hint">) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          name={name}
          type="checkbox"
          required={required}
          className="mt-1 size-5 shrink-0 accent-olive"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <label htmlFor={id} className="text-[0.9375rem]">
          {label}
        </label>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Honeypot (Netlify's bot-field): hidden from people and screen readers, tempting to bots. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[10000px] top-auto size-px overflow-hidden">
      <label>
        Website
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-[#a3402e]/40 bg-[#fbeee9] px-4 py-3 text-[#7a2f22]">
      {message}
    </p>
  );
}
