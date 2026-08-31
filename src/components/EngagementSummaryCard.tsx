"use client";

import { SERIES_SLOTS, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { EngagementSummary } from "@/lib/engagement";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * Outbound volume split by who actually sent it.
 *
 * `ai_conversations` counts every message in an active thread, which mixes the
 * automation with whatever the team typed by hand. This card keeps the two
 * apart, because "the sequences sent 285 texts" and "the team sent 138" are
 * different facts with different consequences.
 */
export function EngagementSummaryCard({
  summary,
  loading,
  refetching,
  subtitle,
}: {
  summary: EngagementSummary;
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  const outbound = summary.automated + summary.manual;
  const autoShare = outbound > 0 ? (summary.automated / outbound) * 100 : 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Outbound and replies" subtitle={subtitle} />

      <div className={cn("px-5 pt-1 pb-5", refetching && "refetching")}>
        {loading ? (
          <>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-5 h-20 w-full" />
          </>
        ) : (
          <>
            <div>
              <p className="text-[32px] leading-none font-semibold text-ink">
                {summary.replyRate === null
                  ? "—"
                  : formatPct(summary.replyRate, 1)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Replies per automated message sent
              </p>
            </div>

            <div className="mt-5">
              <div
                className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
                style={{ background: viz.track }}
                role="img"
                aria-label={`Automated ${summary.automated}, manual ${summary.manual}`}
              >
                {outbound > 0 ? (
                  <>
                    <span
                      className="h-full first:rounded-l-full"
                      style={{
                        width: `${autoShare}%`,
                        background: SERIES_SLOTS[0],
                      }}
                    />
                    <span
                      className="h-full last:rounded-r-full"
                      style={{
                        width: `${100 - autoShare}%`,
                        background: viz.recessive,
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>

            <ul className="mt-5 space-y-2.5">
              <Row
                color={SERIES_SLOTS[0]}
                label="Sent by automation"
                value={summary.automated}
              />
              <Row
                color={viz.recessive}
                label="Sent by the team"
                value={summary.manual}
              />
              <Row label="Replies received" value={summary.replies} />
              <Row
                label="Failed to deliver"
                value={summary.failed}
                tone={summary.failed > 0 ? viz.down : undefined}
              />
              <Row
                label="Opted out"
                value={summary.optOuts}
                tone={summary.optOuts > 0 ? viz.down : undefined}
              />
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}

function Row({
  color,
  label,
  value,
  tone,
}: {
  color?: string;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {color ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
      ) : (
        <span className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      )}
      <span className="text-ink-soft">{label}</span>
      <span
        className="nums ml-auto font-medium text-ink"
        style={tone ? { color: tone } : undefined}
      >
        {formatCount(value)}
      </span>
    </li>
  );
}
