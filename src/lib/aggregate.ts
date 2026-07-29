import {
  dateRange,
  formatMonth,
  formatShort,
  startOfMonth,
  startOfWeek,
  weekdayIndex,
} from "./dates";
import {
  MetricRow,
  SERIES,
  SeriesId,
  SourceSelection,
  rowMatches,
} from "./metrics";

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
 * Ordered, de-duplicated buckets covering [from, to] — derived from the calendar
 * rather than the data, so days with no rows render as zero instead of
 * collapsing the chart.
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
  selection?: SourceSelection,
): number {
  const def = SERIES[seriesId];
  let total = 0;
  for (const row of rows) {
    if (!inRange(row.metric_date, from, to)) continue;
    if (rowMatches(row, def, selection)) total += row.count;
  }
  return total;
}

/**
 * Totals per `source` for one metric_key — powers the breakdown cards.
 * Returns every source present in the data, including ones not in the
 * documented category list.
 */
export function sumBySource(
  rows: MetricRow[],
  metricKey: string,
  from: string,
  to: string,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    if (row.metric_key !== metricKey) continue;
    if (!inRange(row.metric_date, from, to)) continue;
    out[row.source] = (out[row.source] ?? 0) + row.count;
  }
  return out;
}

/** Time series for the trend chart, one key per requested series. */
export function buildChartData(
  rows: MetricRow[],
  seriesIds: SeriesId[],
  from: string,
  to: string,
  g: Granularity,
  selection?: SourceSelection,
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
      if (rowMatches(row, SERIES[id], selection)) {
        point[id] = (point[id] as number) + row.count;
      }
    }
  }

  return buckets.map((b) => index.get(b)!);
}

/** Totals per weekday across the window — powers the "Most active day" card. */
export function buildWeekdayData(
  rows: MetricRow[],
  seriesId: SeriesId,
  from: string,
  to: string,
  selection?: SourceSelection,
): number[] {
  const def = SERIES[seriesId];
  const totals = new Array(7).fill(0);
  for (const row of rows) {
    if (!inRange(row.metric_date, from, to)) continue;
    if (rowMatches(row, def, selection)) {
      totals[weekdayIndex(row.metric_date)] += row.count;
    }
  }
  return totals;
}

/**
 * Percent change vs. the preceding window of equal length.
 * Null when there is no baseline, so the UI can say "no prior data" instead of
 * showing a meaningless +100%.
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
  selection?: SourceSelection,
): TableRow[] {
  const points = buildChartData(rows, seriesIds, from, to, g, selection);
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

/** Per-bucket, per-source detail — the CSV export's second sheet-worth of data. */
export type SourceTableRow = {
  bucket: string;
  label: string;
  metricKey: string;
  source: string;
  count: number;
};

export function buildSourceDetail(
  rows: MetricRow[],
  metricKeys: string[],
  from: string,
  to: string,
  g: Granularity,
): SourceTableRow[] {
  const acc = new Map<string, SourceTableRow>();

  for (const row of rows) {
    if (!metricKeys.includes(row.metric_key)) continue;
    if (!inRange(row.metric_date, from, to)) continue;

    const bucket = bucketOf(row.metric_date, g);
    const key = `${bucket}|${row.metric_key}|${row.source}`;
    const existing = acc.get(key);
    if (existing) {
      existing.count += row.count;
    } else {
      acc.set(key, {
        bucket,
        label: labelOf(bucket, g),
        metricKey: row.metric_key,
        source: row.source,
        count: row.count,
      });
    }
  }

  return [...acc.values()].sort(
    (a, b) =>
      b.bucket.localeCompare(a.bucket) ||
      a.metricKey.localeCompare(b.metricKey) ||
      a.source.localeCompare(b.source),
  );
}
