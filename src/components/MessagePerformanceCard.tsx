"use client";

import { useMemo, useState } from "react";
import { SERIES_SLOTS, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { StepPerformance } from "@/lib/engagement";
import { Card, CardHeader } from "./ui/Card";
import { InfoTip, TipRow } from "./ui/InfoTip";
import { Skeleton } from "./ui/Skeleton";

type SortKey = "replied" | "sent" | "rate";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "replied", label: "Most replies" },
  { key: "sent", label: "Most sent" },
  { key: "rate", label: "Best reply rate" },
];

/**
 * Reply rate per individual message, not per workflow.
 *
 * A workflow-level reply rate says the sequence works or it doesn't. This says
 * which message in it did the work, which is the difference between knowing
 * there is a problem and knowing where it is.
 *
 * Every message sent in the period is listed. The table scrolls rather than
 * truncating: a "top 12 of 28" with no way to reach the other 16 tells you
 * something is being hidden without telling you what.
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
  // Replies first by default: the question this card answers is which message
  // gets people to write back, and the biggest sender is usually just the one
  // at the top of the funnel.
  const [sort, setSort] = useState<SortKey>("replied");

  const shown = useMemo(() => {
    const rows = [...steps];
    rows.sort((a, b) => {
      if (sort === "sent") return b.sent - a.sent || b.replied - a.replied;
      if (sort === "rate") {
        return (b.rate ?? -1) - (a.rate ?? -1) || b.replied - a.replied;
      }
      return b.replied - a.replied || b.sent - a.sent;
    });
    return rows;
  }, [steps, sort]);

  const maxSent = Math.max(...shown.map((s) => s.sent), 1);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Reply rate by message"
        subtitle={subtitle}
        info={
          <InfoTip title="Reply rate by message">
            <TipRow label="What it is">
              Every automated message sent in the period, with how many contacts
              wrote back after it.
            </TipRow>
            <TipRow label="How it is worked out">
              A reply is credited to the last automated message sent before it{" "}
              <em>on the same channel</em>, within seven days. Messages are
              grouped by their snippet name, so one snippet edited twice is one
              row.
            </TipRow>
            <TipRow label="Read it carefully">
              Reminders and confirmations are counted here and are not asking
              for a reply. No contact has ever replied to an email in this
              account, so an email row reads 0% by nature, not by performance.
            </TipRow>
            <TipRow label="Filters">
              The period picker changes which sends are counted; a message not
              sent in the period is not listed. The origin filter narrows it to the leads of one source, matched through the contact rather than the message, so leads with no origin on file are left out. Click a row for
              the contacts who replied.
            </TipRow>
          </InfoTip>
        }
        action={
          steps.length > 0 ? (
            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="sr-only">Sort messages by</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink-soft focus-visible:ring-2 focus-visible:ring-ink-soft focus-visible:outline-none"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
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
          <div className="thin-scroll -mx-1 max-h-[26rem] overflow-x-auto overflow-y-auto px-1">
            <table className="w-full min-w-[520px] border-collapse">
              <thead className="sticky top-0 z-10 bg-surface">
                <tr className="text-left text-[11px] tracking-wide text-ink-muted uppercase">
                  <th className="py-2 pr-3 font-medium">
                    Message <span className="normal-case">({shown.length})</span>
                  </th>
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
                      <td className="max-w-0 py-2 pr-3">
                        <span
                          className="block truncate text-sm text-ink"
                          title={s.label}
                        >
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
