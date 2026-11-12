"use client";

import { useId } from "react";
import type { BookableDay } from "@/lib/restorative";

/**
 * Preferred date and time as two dropdowns, instead of the browser's own date-time picker.
 *
 * Why: a native <input type="datetime-local"> is drawn in the visitor's device locale, so the
 * same field shows 26/11/2026 and 24-hour times on a UK- or EU-set machine. These lists are
 * written by the site ("Thursday, November 26, 2026", "2:00 PM"), so everyone sees US format,
 * and they only contain dates and times that pass the booking rules (BOOKING_HOURS), so there
 * is nothing invalid to type. The value sent is still one "YYYY-MM-DDTHH:mm" in Florida time.
 */
export function PreferredTimeField({
  days,
  date,
  time,
  onDate,
  onTime,
  hint,
  error,
}: {
  /** null until the browser has worked out the current time. */
  days: BookableDay[] | null;
  date: string;
  time: string;
  onDate: (date: string) => void;
  onTime: (time: string) => void;
  hint: string;
  error?: string;
}) {
  const id = useId();
  const day = days?.find((d) => d.date === date) ?? null;
  const describedBy = [`${id}-hint`, error ? `${id}-error` : null].filter(Boolean).join(" ");
  return (
    <fieldset aria-describedby={describedBy}>
      <legend className="field-label">Preferred date and time</legend>
      <p id={`${id}-hint`} className="field-hint">
        {hint}
      </p>
      <div className="mt-2 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-date`} className="field-label">
            Preferred date
          </label>
          <select
            id={`${id}-date`}
            value={day ? date : ""}
            onChange={(e) => {
              const next = days?.find((d) => d.date === e.target.value);
              onDate(e.target.value);
              if (!next?.times.some((t) => t.value === time)) onTime("");
            }}
            className="field-input appearance-auto"
            aria-invalid={error && !day ? true : undefined}
            aria-describedby={describedBy}
            data-testid="preferred-date"
          >
            <option value="">{days ? "Choose a date" : "Loading dates…"}</option>
            {days?.map((d) => (
              <option key={d.date} value={d.date}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-time`} className="field-label">
            Preferred time
          </label>
          <select
            id={`${id}-time`}
            value={day?.times.some((t) => t.value === time) ? time : ""}
            onChange={(e) => onTime(e.target.value)}
            disabled={!day}
            className="field-input appearance-auto"
            aria-invalid={error && day ? true : undefined}
            aria-describedby={describedBy}
            data-testid="preferred-time"
          >
            <option value="">{day ? "Choose a time" : "Choose a date first"}</option>
            {day?.times.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
