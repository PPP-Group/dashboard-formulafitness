"use client";

import { SERIES_SLOTS, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { StepPerformance } from "@/lib/engagement";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * How many rows before the list stops being scannable. The rest stay reachable
 * through the CSV export rather than turning the card into a spreadsheet.
 */
const VISIBLE = 12;

/**
 * Reply rate per individual message, not per workflow.
 *
 * A workflow-level reply rate says the sequence works or it doesn't. This says
 * which message in it did the work, which is the difference between knowing
 * there is a problem and knowing where it is.
 */
export function MessagePerformanceCard({
  steps,
  loading,
  refetching,
  subtitle,
  onSelect,
}: {
  steps: StepPerformance[];
  loading: boolean;
  refetching: boolean;
  subtitle: string;
  onSelect?: (step: StepPerformance) => void;
}) {
  const shown = steps.slice(0, VISIBLE);
  const maxSent = Math.max(...shown.map((s) => s.sent), 1);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Reply rate by message"
        subtitle={subtitle}
        action={
          steps.length > VISIBLE ? (
            <span className="text-xs text-ink-muted">
              top {VISIBLE} of {steps.length}
            </span>
          ) : null
        }
      />

      <div className={cn("min-h-0 flex-1 px-5 pb-5", refetching && "refetching")}>
        {loading ? (
          <div className="space-y-3 pt-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-muted">
            No automated messages measured in this period.
          </p>
        ) : (
          <div className="thin-scroll -mx-1 overflow-x-auto px-1">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr className="text-left text-[11px] tracking-wide text-ink-muted uppercase">
                  <th className="py-2 pr-3 font-medium">Message</th>
                  <th className="w-20 py-2 pr-3 text-right font-medium">Sent</th>
                  <th className="w-24 py-2 pr-3 text-right font-medium">
                    Replies
                  </th>
                  <th className="w-32 py-2 font-medium">Reply rate</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => {
                  const barPct = (s.sent / maxSent) * 100;
                  const ratePct = s.rate ?? 0;
                  const silent = s.replied === 0;

                  const cells = (
                    <>
                      <td className="max-w-0 py-2 pr-3">
                        <span className="block truncate text-sm text-ink" title={s.label}>
                          {s.label}
                        </span>
                        <span
                          className="mt-1 block h-1 rounded-full"
                          style={{
                            width: `${barPct}%`,
                            background: SERIES_SLOTS[0],
                            opacity: 0.35,
                          }}
                          aria-hidden="true"
                        />
                      </td>
                      <td className="nums py-2 pr-3 text-right text-sm text-ink-soft">
                        {formatCount(s.sent)}
                      </td>
                      <td className="nums py-2 pr-3 text-right text-sm">
                        {silent ? (
                          <span
                            className="rounded px-1.5 py-0.5 text-xs font-medium"
                            style={{ color: viz.down, background: "#fef2f2" }}
                          >
                            0
                          </span>
                        ) : (
                          <span className="font-medium text-ink">
                            {formatCount(s.replied)}
                          </span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-1.5 min-w-[52px] flex-1 rounded-full"
                            style={{ background: viz.track }}
                            aria-hidden="true"
                          >
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${Math.min(ratePct, 100)}%`,
                                background: SERIES_SLOTS[0],
                              }}
                            />
                          </span>
                          <span className="nums w-11 shrink-0 text-right text-xs text-ink-soft">
                            {s.rate === null ? "—" : formatPct(s.rate, 0)}
                          </span>
                        </span>
                      </td>
                    </>
                  );

                  return (
                    <tr
                      key={s.id}
                      className={cn(
                        "border-t border-line",
                        onSelect && "cursor-pointer hover:bg-raised",
                      )}
                      onClick={onSelect ? () => onSelect(s) : undefined}
                      tabIndex={onSelect ? 0 : undefined}
                      role={onSelect ? "button" : undefined}
                      onKeyDown={
                        onSelect
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelect(s);
                              }
                            }
                          : undefined
                      }
                    >
                      {cells}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {shown.length > 0 ? (
          <p className="mt-3 text-[11px] text-ink-faint">
            Replies are credited to the last automated message sent before them.
            Reminders and confirmations are counted here too, and are not asking
            for a reply.
          </p>
        ) : null}
      </div>
    </Card>
  );
}
