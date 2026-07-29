import {
  dateRange,
  formatMonth,
  formatShort,
  startOfMonth,
  startOfWeek,
  weekdayIndex,
} from "./dates";
import { MetricRow, SERIES, SeriesId, rowMatches } from "./metrics";

export type Granularity = "daily" | "weekly" | "monthly";

export type ChartPoint = {
  bucket: string;
  label: string;
  [seriesId: string]: string | number;
};

function bucketOf(iso: string, g: Granularity): string {
  if (g === "weekly") return startOfWeek(iso);
  if (g === "monthly") return startOfMonth(iso);
  return iso;
}

function labelOf(bucket: string, g: Granularity): string {
  if (g === "monthly") return formatMonth(bucket);
  if (g === "weekly") return `Wk ${formatShort(bucket)}`;
  return formatShort(bucket);
}

/**
 * Ordered, de-duplicated list of buckets covering [from, to] — derived from the
 * calendar rather than from the data, so days with no rows still render as zero
 * instead of collapsing the chart.
 */
function bucketsIn(from: string, to: string, g: Granularity): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const day of dateRange(from, to)) {
    const b = bucketOf(day, g);
    if (!seen.has(b)) {
      seen.add(b);
      out.push(b);
    }
  }
  return out;
}

export function inRange(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to;
}

/** Total for one series across a date window. */
export function sumInRange(
  rows: MetricRow[],
  seriesId: SeriesId,
  from: string,
  to: string,
): number {
  const def = SERIES[seriesId];
  let total = 0;
  for (const row of rows) {
    if (!inRange(row.metric_date, from, to)) continue;
    if (rowMatches(row, def)) total += row.count;
  }
  return total;
}

/** Time series for the trend chart, one key per requested series. */
export function buildChartData(
  rows: MetricRow[],
  seriesIds: SeriesId[],
  from: string,
  to: string,
  g: Granularity,
): ChartPoint[] {
  const buckets = bucketsIn(from, to, g);
  const index = new Map<string, ChartPoint>();

  for (const b of buckets) {
    const point: ChartPoint = { bucket: b, label: labelOf(b, g) };
    for (const id of seriesIds) point[id] = 0;
    index.set(b, point);
  }

  for (const row of rows) {
    if (!inRange(row.metric_date, from, to)) continue;
    const point = index.get(bucketOf(row.metric_date, g));
    if (!point) continue;
    for (const id of seriesIds) {
      if (rowMatches(row, SERIES[id])) {
        point[id] = (point[id] as number) + row.count;
      }
    }
  }

  return buckets.map((b) => index.get(b)!);
}

/** Totals per weekday across the window — powers the "Most Active Day" card. */
export function buildWeekdayData(
  rows: MetricRow[],
  seriesId: SeriesId,
  from: string,
  to: string,
): number[] {
  const def = SERIES[seriesId];
  const totals = new Array(7).fill(0);
  for (const row of rows) {
    if (!inRange(row.metric_date, from, to)) continue;
    if (rowMatches(row, def)) {
      totals[weekdayIndex(row.metric_date)] += row.count;
    }
  }
  return totals;
}

/**
 * Percent change vs. the preceding window of equal length.
 * Returns null when there is no baseline to compare against, so the UI can say
 * "no prior data" instead of showing a meaningless +100%.
 */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export type TableRow = {
  bucket: string;
  label: string;
  values: Record<SeriesId, number>;
  total: number;
};

export function buildTableData(
  rows: MetricRow[],
  seriesIds: SeriesId[],
  from: string,
  to: string,
  g: Granularity,
): TableRow[] {
  const points = buildChartData(rows, seriesIds, from, to, g);
  return points
    .map((p) => {
      const values = {} as Record<SeriesId, number>;
      let total = 0;
      for (const id of seriesIds) {
        const v = p[id] as number;
        values[id] = v;
        total += v;
      }
      return { bucket: p.bucket, label: p.label, values, total };
    })
    .reverse(); // newest first
}
