"use client";

import { Filter } from "lucide-react";
import { brand, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { LEAD_SOURCES, mergeSources } from "@/lib/metrics";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * Ranked bars, single hue — deliberately NOT eight categorical colours.
 *
 * Lead origins are nominal (no natural order), so colouring each one
 * differently would spend the identity channel re-encoding what bar length
 * already shows, and eight classes is past the point where adjacent hues stay
 * distinguishable. One series, one colour, sorted by volume, direct-labelled.
 */
export function LeadSourceCard({
  totals,
  selected,
  onSelect,
  loading,
  refetching,
  subtitle,
}: {
  totals: Record<string, number>;
  selected: string | null;
  onSelect: (source: string | null) => void;
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  const categories = mergeSources(LEAD_SOURCES, Object.keys(totals));
  const rows = categories
    .map((c) => ({ ...c, count: totals[c.value] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const grand = rows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...rows.map((r) => r.count), 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Leads by origin"
        subtitle={subtitle}
        action={
          selected ? (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-dark hover:bg-brand-soft"
            >
              Clear filter
            </button>
          ) : null
        }
      />

      <div className={cn("flex-1 px-5 pt-1 pb-5", refetching && "refetching")}>
        {loading ? (
          <div className="space-y-3">
            {LEAD_SOURCES.slice(0, 5).map((s) => (
              <Skeleton key={s.value} className="h-7" />
            ))}
          </div>
        ) : grand === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            No leads created in this period.
          </p>
        ) : (
          <>
            <ul className="space-y-2.5">
              {rows.map((r) => {
                const share = grand > 0 ? (r.count / grand) * 100 : 0;
                const width = max > 0 ? (r.count / max) * 100 : 0;
                const isSelected = selected === r.value;
                const isDimmed = selected !== null && !isSelected;

                return (
                  <li key={r.value}>
                    <button
                      type="button"
                      onClick={() => onSelect(isSelected ? null : r.value)}
                      aria-pressed={isSelected}
                      className={cn(
                        "-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-3 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-canvas",
                        isDimmed && "opacity-45",
                        isSelected && "bg-brand-soft hover:bg-brand-soft",
                      )}
                    >
                      <span
                        className={cn(
                          "w-20 shrink-0 truncate text-xs",
                          isSelected
                            ? "font-semibold text-ink"
                            : "text-ink-soft",
                        )}
                      >
                        {r.label}
                      </span>

                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-raised">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${width}%`,
                            background:
                              r.count > 0 ? brand.primary : "transparent",
                          }}
                        />
                      </span>

                      <span
                        className={cn(
                          "nums w-7 shrink-0 text-right text-xs",
                          r.count > 0
                            ? "font-medium text-ink"
                            : "text-ink-faint",
                        )}
                      >
                        {formatCount(r.count)}
                      </span>
                      <span
                        className="nums w-9 shrink-0 text-right text-[11px]"
                        style={{ color: viz.muted }}
                      >
                        {formatPct(share, 0)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/*
              Deliberately says "the Leads metric" and not "the dashboard":
              origin only exists on this metric, so that is the honest scope.
            */}
            <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
              <Filter size={11} className="mt-0.5 shrink-0" aria-hidden="true" />
              {selected
                ? "Scoping the Leads metric to this origin — click again to clear."
                : "Click an origin to scope the Leads metric to it. Other metrics carry no origin breakdown."}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
