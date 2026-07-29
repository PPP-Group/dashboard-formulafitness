"use client";

import { cn, formatCount, formatPct } from "@/lib/cn";
import { AI_CHANNELS, SERIES } from "@/lib/metrics";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * Part-to-whole across the three channels. Read-only by design — the channel
 * split is information, not a filter dimension.
 *
 * The underlying metric counts every message exchanged in active conversations
 * — the AI replies to all of them, which is why the card keeps the "AI
 * Conversations" name, but the unit is messages, not conversation threads. The
 * caption says so rather than leaving the reader to assume.
 */
export function AiChannelsCard({
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
  const total = totals.reduce((a, b) => a + b, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader title="AI Conversations" subtitle={subtitle} />

      <div className={cn("flex-1 px-5 pt-1 pb-5", refetching && "refetching")}>
        {loading ? (
          <>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-5 h-24 w-full" />
          </>
        ) : (
          <>
            <p className="text-[32px] leading-none font-semibold text-ink">
              {formatCount(total)}
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              messages exchanged across active conversations
            </p>

            {/* 2px surface gaps separate segments — no borders around marks. */}
            <div
              className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-raised"
              role="img"
              aria-label={AI_CHANNELS.map(
                (id, i) => `${SERIES[id].label}: ${totals[i] ?? 0}`,
              ).join(", ")}
            >
              {total > 0
                ? AI_CHANNELS.map((id, i) => {
                    const v = totals[i] ?? 0;
                    if (v === 0) return null;
                    return (
                      <span
                        key={id}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{
                          width: `${(v / total) * 100}%`,
                          background: SERIES[id].color,
                        }}
                      />
                    );
                  })
                : null}
            </div>

            {/* Legend doubles as the direct-label channel for sub-3:1 fills. */}
            <ul className="mt-4 space-y-2.5">
              {AI_CHANNELS.map((id, i) => {
                const v = totals[i] ?? 0;
                const share = total > 0 ? (v / total) * 100 : 0;
                return (
                  <li key={id} className="flex items-center gap-2.5 text-sm">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: SERIES[id].color }}
                      aria-hidden="true"
                    />
                    <span className="text-ink-soft">{SERIES[id].label}</span>
                    <span className="nums ml-auto font-medium text-ink">
                      {formatCount(v)}
                    </span>
                    <span className="nums w-12 shrink-0 text-right text-xs text-ink-muted">
                      {formatPct(share, 0)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {total === 0 ? (
              <p className="mt-4 text-xs text-ink-muted">
                No messages in this period.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
