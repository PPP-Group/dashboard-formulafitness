"use client";

import { FUNNEL_RAMP } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { FUNNEL_SERIES, SERIES } from "@/lib/metrics";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * Stage volume, deliberately NOT stage-to-stage conversion.
 *
 * These four stages are not a strict sequence: `consultation_booked` counts only
 * the $100 modality, and an opportunity can reach Closed Won without passing
 * through it. They also count stage entries per day rather than following a
 * cohort. A "% continue" between bars would therefore be fiction — the bars show
 * relative volume and nothing more.
 *
 * Ordinal ramp, not categorical: stage order is meaning, so it takes one hue in
 * lightness steps rather than four competing identities.
 */
export function FunnelCard({
  totals,
  loading,
  refetching,
  subtitle,
}: {
  totals: number[];
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  const max = Math.max(...totals, 0);
  const hasData = totals.some((t) => t > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Stage volume" subtitle={subtitle} />

      <div className={cn("flex-1 px-5 pt-1 pb-5", refetching && "refetching")}>
        {loading ? (
          <div className="space-y-5">
            {FUNNEL_SERIES.map((id) => (
              <Skeleton key={id} className="h-12" />
            ))}
          </div>
        ) : !hasData ? (
          <p className="py-8 text-center text-sm text-ink-muted">
            No stage activity in this period.
          </p>
        ) : (
          <>
            <ol className="space-y-4">
              {FUNNEL_SERIES.map((id, i) => {
                const value = totals[i] ?? 0;
                // Bars are scaled to the busiest stage, so the comparison is
                // volume-to-volume rather than a share of some assumed top.
                const pct = max > 0 ? (value / max) * 100 : 0;
                const width = value > 0 ? Math.max(pct, 6) : 0;
                const share = max > 0 ? (value / max) * 100 : 0;

                return (
                  <li key={id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm text-ink-soft">
                        {SERIES[id].label}
                      </span>
                      <span className="nums shrink-0 text-sm font-semibold text-ink">
                        {formatCount(value)}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${width}%`,
                            background: FUNNEL_RAMP[i],
                          }}
                        />
                      </div>
                      <span className="nums w-10 shrink-0 text-right text-[11px] text-ink-muted">
                        {formatPct(share, 0)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 text-[11px] leading-relaxed text-ink-faint">
              Volume per stage, relative to the busiest. Not a conversion
              funnel — Consultations Booked counts the $100 modality only, and
              an opportunity can close without it.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
