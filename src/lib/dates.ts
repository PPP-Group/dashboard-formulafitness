/**
 * Date helpers.
 *
 * `metrics_daily.metric_date` is a plain SQL `date` already expressed in the
 * gym's timezone (America/Los_Angeles). It must never be run through
 * `new Date("2026-07-29")` — that parses as UTC midnight and shifts the day
 * backwards for anyone west of UTC (including Brazil), which would silently
 * mislabel every bar on the chart.
 */

export const GYM_TZ = "America/Los_Angeles";

/** "YYYY-MM-DD" -> Date at local midnight (no timezone shift). */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Date -> "YYYY-MM-DD" using local fields (inverse of parseDateOnly). */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today as seen at the gym, not in the viewer's timezone. */
export function todayInGymTz(): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Every date from `start` to `end` inclusive. Used to fill gaps with zeros. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  // Guard against a malformed range producing an infinite loop.
  for (let i = 0; cur <= end && i < 1000; i++) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

/** Monday of the week containing `iso` — matches Postgres date_trunc('week'). */
export function startOfWeek(iso: string): string {
  const d = parseDateOnly(iso);
  const dow = d.getDay(); // 0 = Sunday
  const backToMonday = dow === 0 ? 6 : dow - 1;
  d.setDate(d.getDate() - backToMonday);
  return toISODate(d);
}

export function startOfMonth(iso: string): string {
  const [y, m] = iso.split("-");
  return `${y}-${m}-01`;
}

/** Short axis label, e.g. "Jul 29". */
export function formatShort(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "Jul 29, 2026" */
export function formatLong(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMonth(iso: string): string {
  return parseDateOnly(iso).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function weekdayIndex(iso: string): number {
  return parseDateOnly(iso).getDay();
}
