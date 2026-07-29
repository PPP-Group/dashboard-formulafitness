import { SourceTableRow, TableRow } from "./aggregate";
import { SERIES, SeriesId, humanizeSource } from "./metrics";

function escape(cell: string | number): string {
  const s = String(cell);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toRows(matrix: (string | number)[][]): string {
  return matrix.map((r) => r.map(escape).join(",")).join("\r\n");
}

/**
 * Two blocks in one file: the wide table that's on screen, then the long-format
 * per-category detail. The breakdown metrics carry information the wide table
 * flattens away, so exporting only the former would lose it.
 */
export function toCsv(
  rows: TableRow[],
  seriesIds: SeriesId[],
  detail: SourceTableRow[],
): string {
  const wide: (string | number)[][] = [
    ["Period", ...seriesIds.map((id) => SERIES[id].label), "Total"],
    ...rows.map((row) => [
      row.bucket,
      ...seriesIds.map((id) => row.values[id]),
      row.total,
    ]),
  ];

  const long: (string | number)[][] = [
    ["Period", "Metric", "Category", "Count"],
    ...detail.map((d) => [
      d.bucket,
      d.metricKey,
      d.source === "" ? "(none)" : humanizeSource(d.source),
      d.count,
    ]),
  ];

  return [
    "# Summary",
    toRows(wide),
    "",
    "# Detail by category",
    toRows(long),
  ].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM so Excel opens UTF-8 correctly.
  const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
