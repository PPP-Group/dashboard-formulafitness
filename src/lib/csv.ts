import { TableRow } from "./aggregate";
import { SERIES, SeriesId } from "./metrics";

function escape(cell: string | number): string {
  const s = String(cell);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: TableRow[], seriesIds: SeriesId[]): string {
  const header = ["Period", ...seriesIds.map((id) => SERIES[id].label), "Total"];
  const body = rows.map((row) => [
    row.bucket,
    ...seriesIds.map((id) => row.values[id]),
    row.total,
  ]);
  return [header, ...body].map((r) => r.map(escape).join(",")).join("\r\n");
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
