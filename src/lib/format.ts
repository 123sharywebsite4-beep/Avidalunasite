export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export function formatDuration(minutes: number | null): string | null {
  return minutes ? `${minutes} min` : null;
}

export function formatEventDate(date: string): string {
  // A plain calendar date ("2026-11-26"): formatted as written, in UTC, so no device or server
  // time zone can move it to the day before or after. -> "Thursday, November 26, 2026".
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** "18:30" (Florida wall-clock, from Sanity) -> "6:30 PM". 12-hour, no time zone conversion. */
export function formatTime(time: string | null): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** "2026-11-20" + "18:30" -> "2026-11-20T18:30:00-05:00" using Florida's offset on that date. */
export function floridaIso(date: string, time: string | null): string {
  if (!time) return date;
  const probe = new Date(`${date}T12:00:00Z`);
  const offset =
    new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "longOffset" })
      .formatToParts(probe)
      .find((p) => p.type === "timeZoneName")
      ?.value.replace("GMT", "") || "-05:00";
  return `${date}T${time}:00${offset}`;
}
