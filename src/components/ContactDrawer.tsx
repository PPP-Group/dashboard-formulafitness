"use client";

import { useEffect, useMemo, useRef } from "react";
import { ArrowUpRight, X } from "lucide-react";
import { ContactRow, useMetricContacts } from "@/hooks/useMetricContacts";
import { ghlContactUrl } from "@/lib/ghl";
import { formatLong } from "@/lib/dates";
import { Skeleton } from "./ui/Skeleton";

export type DrillTarget = {
  metricKey: string;
  /** Shown as the dialog heading. */
  label: string;
  from: string;
  to: string;
  /** null = every source for this metric. A list matches any of them. */
  source?: string | string[] | null;
  /** Period text under the heading. */
  periodLabel: string;
};

/**
 * The contacts behind a number.
 *
 * Every row links to that contact in GoHighLevel, which is the whole point:
 * the dashboard says how many, GHL says who and what they said, and this is the
 * one click between them.
 */
export function ContactDrawer({
  target,
  onClose,
}: {
  target: DrillTarget | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  const { rows: rawRows, loading, error, unavailable } = useMetricContacts(
    target?.metricKey ?? null,
    target?.from ?? "",
    target?.to ?? "",
    target?.source ?? null,
  );

  /**
   * One row per person, not per row in the table.
   *
   * metric_contacts keys a row on (metric, day, source, contact), which is what
   * keeps it lined up with the daily counts. A contact who replied on two days,
   * or over both SMS and voice, therefore has several rows and was being listed
   * several times. The drawer answers "who", and a person is one person: rows
   * are folded by contact, newest first, with a count when there is more than
   * one occurrence behind the name.
   */
  const rows = useMemo(() => {
    const byContact = new Map<
      string,
      { row: ContactRow; times: number }
    >();
    for (const r of rawRows) {
      const seen = byContact.get(r.ghl_contact_id);
      if (!seen) {
        byContact.set(r.ghl_contact_id, { row: r, times: 1 });
        continue;
      }
      seen.times += 1;
      // Keep the most recent occurrence as the one on show.
      if (r.metric_date > seen.row.metric_date) seen.row = r;
    }
    return [...byContact.values()].sort(
      (a, b) =>
        (a.row.metric_date < b.row.metric_date ? 1 : -1) ||
        (a.row.contact_name ?? "").localeCompare(b.row.contact_name ?? ""),
    );
  }, [rawRows]);

  // Escape closes, and the close button takes focus so keyboard users land
  // somewhere useful instead of at the top of the page behind the overlay.
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-navy/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drill-title"
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-xl sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id="drill-title" className="text-[15px] font-semibold text-ink">
              {target.label}
            </h2>
            <p className="mt-0.5 text-xs text-ink-soft">
              {target.periodLabel}
              {rows.length > 0
                ? ` · ${rows.length} contact${rows.length === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-raised hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <ul className="divide-y divide-line">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="px-5 py-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-64" />
                </li>
              ))}
            </ul>
          ) : unavailable ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              Contact-level detail is not switched on yet. The counts above are
              live; the list of who is behind them arrives with the next sync.
            </p>
          ) : error ? (
            <p className="px-5 py-10 text-center text-sm text-down">{error}</p>
          ) : rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink-muted">
              No contacts recorded for this metric in this period.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map(({ row: r, times }) => (
                <li key={r.ghl_contact_id}>
                  <a
                    href={ghlContactUrl(r.ghl_contact_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-raised"
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-ink">
                          {r.contact_name?.trim() || "Unnamed contact"}
                        </span>
                        {times > 1 ? (
                          <span className="nums shrink-0 rounded-full bg-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                            ×{times}
                          </span>
                        ) : null}
                      </span>
                      {r.detail ? (
                        <span className="mt-0.5 block truncate text-xs text-ink-soft">
                          {r.detail}
                        </span>
                      ) : null}
                      <span className="nums mt-0.5 block text-xs text-ink-muted">
                        {formatLong(r.metric_date)}
                      </span>
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="mt-0.5 shrink-0 text-ink-faint"
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-line px-5 py-3">
          <p className="text-xs text-ink-muted">
            Opens the contact in GoHighLevel in a new tab.
          </p>
        </footer>
      </div>
    </div>
  );
}
