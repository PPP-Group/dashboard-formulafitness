"use client";

import { TableRow } from "@/lib/aggregate";
import { cn, formatCount } from "@/lib/cn";
import { SERIES, SeriesId } from "@/lib/metrics";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { InfoTip, TipRow } from "./ui/InfoTip";

/**
 * The table view every chart on this page is measured against — the
 * WCAG-clean twin, and the relief channel for the series colours that sit
 * below 3:1 on white.
 */
export function BreakdownTable({
  rows,
  seriesIds,
  loading,
  refetching,
  subtitle,
}: {
  rows: TableRow[];
  seriesIds: SeriesId[];
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  return (
    <Card className="flex flex-col overflow-hidden">
      <CardHeader
        title="Breakdown"
        subtitle={subtitle}
        info={
          <InfoTip title="Breakdown" align="right">
              <TipRow label="What it is">
                Every metric, period by period, as a table you can read across.
              </TipRow>
              <TipRow label="How it is worked out">
                The same daily numbers as the cards above, grouped into the buckets the granularity picker sets: days, weeks or months.
              </TipRow>
              <TipRow label="Filters">
                The period picker sets how many buckets are shown and how wide each one is. The origin filter narrows every row to one lead source.
              </TipRow>
          </InfoTip>
        }
      />

      <div className={cn("min-w-0", refetching && "refetching")}>
        {loading ? (
          <div className="space-y-2 px-5 pb-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-5 pb-8 text-center text-sm text-ink-muted">
            Nothing to show for this period.
          </p>
        ) : (
          <div className="thin-scroll max-h-[420px] overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-[1] bg-surface">
                <tr className="border-b border-line">
                  <th
                    scope="col"
                    className="px-5 py-2.5 text-left text-xs font-medium whitespace-nowrap text-ink-muted"
                  >
                    Period
                  </th>
                  {seriesIds.map((id) => (
                    <th
                      key={id}
                      scope="col"
                      className="px-3 py-2.5 text-right text-xs font-medium whitespace-nowrap text-ink-muted"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: SERIES[id].color }}
                          aria-hidden="true"
                        />
                        {SERIES[id].short}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.bucket}
                    className="border-b border-line last:border-0 hover:bg-canvas"
                  >
                    <th
                      scope="row"
                      className="px-5 py-2.5 text-left font-medium whitespace-nowrap text-ink"
                    >
                      {row.label}
                    </th>
                    {seriesIds.map((id) => (
                      <td
                        key={id}
                        className={cn(
                          "nums px-3 py-2.5 text-right whitespace-nowrap",
                          row.values[id] === 0 ? "text-ink-faint" : "text-ink-soft",
                        )}
                      >
                        {formatCount(row.values[id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
