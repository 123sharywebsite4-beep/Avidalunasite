"use client";

import { useId, useState } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * A calendar date entered month first: Month / Day / Year dropdowns, instead of
 * <input type="date">, which the browser draws in the visitor's own locale (day first on a
 * UK- or EU-set device). Submits one hidden "YYYY-MM-DD" under `name`, or "" until all three
 * are chosen. Years run from `minDate`'s year for `years` years.
 */
export function UsDateField({
  name,
  label,
  minDate,
  years = 2,
  error,
}: {
  name: string;
  label: string;
  /** "YYYY-MM-DD", today in Florida. */
  minDate: string;
  years?: number;
  error?: string;
}) {
  const id = useId();
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const firstYear = Number(minDate.slice(0, 4));
  const value = month && day && year ? `${year}-${month}-${day}` : "";
  const errorId = error ? `${id}-error` : undefined;
  const select = (part: string, labelText: string, current: string, set: (v: string) => void, options: [string, string][]) => (
    <div>
      <label htmlFor={`${id}-${part}`} className="sr-only">
        {labelText}
      </label>
      <select
        id={`${id}-${part}`}
        value={current}
        onChange={(e) => set(e.target.value)}
        className="field-input appearance-auto"
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
      >
        <option value="">{labelText}</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
  return (
    <fieldset>
      <legend className="field-label">{label}</legend>
      <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
        {select("month", "Month", month, setMonth, MONTHS.map((m, i) => [String(i + 1).padStart(2, "0"), m]))}
        {select("day", "Day", day, setDay, Array.from({ length: 31 }, (_, i) => [String(i + 1).padStart(2, "0"), String(i + 1)]))}
        {select("year", "Year", year, setYear, Array.from({ length: years + 1 }, (_, i) => [String(firstYear + i), String(firstYear + i)]))}
      </div>
      <input type="hidden" name={name} value={value} />
      {error ? (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
