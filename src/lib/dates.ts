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

export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6);
}

export function endOfMonth(iso: string): string {
  const d = parseDateOnly(startOfMonth(iso));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0); // day 0 of next month = last day of this one
  return toISODate(d);
}

export function addMonths(iso: string, months: number): string {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(y, m - 1 + months, 1);
  return toISODate(d);
}

/** Inclusive bounds of the bucket containing `iso`, at the given granularity. */
export function bucketBounds(
  iso: string,
  granularity: "daily" | "weekly" | "monthly",
): { start: string; end: string } {
  if (granularity === "weekly") {
    const start = startOfWeek(iso);
    return { start, end: endOfWeek(start) };
  }
  if (granularity === "monthly") {
    const start = startOfMonth(iso);
    return { start, end: endOfMonth(start) };
  }
  return { start: iso, end: iso };
}

/** Step a bucket start forwards or backwards by whole buckets. */
export function shiftBucket(
  iso: string,
  granularity: "daily" | "weekly" | "monthly",
  steps: number,
): string {
  if (granularity === "weekly") return addDays(iso, steps * 7);
  if (granularity === "monthly") return addMonths(iso, steps);
  return addDays(iso, steps);
}

/** "Jul 27 – Aug 2, 2026" */
export function formatWeekRange(weekStart: string): string {
  const start = parseDateOnly(weekStart);
  const end = parseDateOnly(endOfWeek(weekStart));
  const sameMonth = start.getMonth() === end.getMonth();
  const startTxt = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  // Intl renders a day+year request without a month as "2026 (day: 26)", so the
  // same-month case is composed directly rather than asked for.
  const endTxt = sameMonth
    ? `${end.getDate()}, ${end.getFullYear()}`
    : end.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
  return `${startTxt} – ${endTxt}`;
}

/** Human label for a selected bucket, used on the picker buttons. */
export function formatBucketLabel(
  iso: string,
  granularity: "daily" | "weekly" | "monthly",
): string {
  if (granularity === "weekly") return formatWeekRange(iso);
  if (granularity === "monthly") return formatMonth(iso);
  return formatLong(iso);
}

/** Calendar grid for the month containing `iso`, padded to whole Sun–Sat weeks. */
export function monthGrid(iso: string): (string | null)[] {
  const first = parseDateOnly(startOfMonth(iso));
  const last = parseDateOnly(endOfMonth(iso));
  const cells: (string | null)[] = [];

  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(toISODate(new Date(first.getFullYear(), first.getMonth(), d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
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
