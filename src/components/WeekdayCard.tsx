"use client";

import { brand, viz } from "@/lib/brand";
import { WEEKDAY_LABELS } from "@/lib/dates";
import { cn, formatCount } from "@/lib/cn";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * Emphasis, not categorical: the story is "which day is busiest", so the peak
 * takes the brand hue and every other bar recedes to grey.
 */
export function WeekdayCard({
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
  const peak = max > 0 ? totals.indexOf(max) : -1;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Most active day" subtitle={subtitle} />

      <div className={cn("flex-1 px-5 pt-2 pb-5", refetching && "refetching")}>
        {loading ? (
          <Skeleton className="h-40" />
        ) : max === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            No activity in this period.
          </p>
        ) : (
          <div className="flex h-40 items-end gap-2">
            {totals.map((v, i) => {
              const isPeak = i === peak;
              // Floor keeps a non-zero day from vanishing next to a tall peak.
              const h = v > 0 ? Math.max((v / max) * 100, 4) : 0;
              return (
                <div
                  key={WEEKDAY_LABELS[i]}
                  className="flex flex-1 flex-col items-center justify-end gap-1.5"
                  title={`${WEEKDAY_LABELS[i]}: ${formatCount(v)}`}
                >
                  {isPeak ? (
                    <span className="nums text-xs font-semibold text-ink">
                      {formatCount(v)}
                    </span>
                  ) : null}
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${h}%`,
                      minHeight: v > 0 ? 4 : 0,
                      background: isPeak ? brand.primary : viz.recessive,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-[11px]",
                      isPeak ? "font-medium text-ink" : "text-ink-muted",
                    )}
                  >
                    {WEEKDAY_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
