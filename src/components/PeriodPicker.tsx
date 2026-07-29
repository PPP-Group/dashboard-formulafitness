"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Granularity } from "@/lib/aggregate";
import {
  addMonths,
  formatBucketLabel,
  formatMonth,
  formatWeekRange,
  monthGrid,
  parseDateOnly,
  shiftBucket,
  startOfMonth,
  startOfWeek,
} from "@/lib/dates";
import { cn } from "@/lib/cn";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function usePopover(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return ref;
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="thin-scroll absolute left-0 z-30 mt-1.5 max-h-80 overflow-auto rounded-xl border border-line bg-surface p-2 shadow-lg">
      {children}
    </div>
  );
}

function DayPicker({
  value,
  min,
  max,
  onPick,
}: {
  value: string;
  min: string;
  max: string;
  onPick: (iso: string) => void;
}) {
  const [month, setMonth] = useState(startOfMonth(value));
  const cells = monthGrid(month);

  const canPrev = month > startOfMonth(min);
  const canNext = month < startOfMonth(max);

  return (
    <div className="w-[248px]">
      <div className="flex items-center justify-between px-1 pb-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Previous month"
          className="rounded-md p-1 text-ink-soft hover:bg-canvas disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium text-ink">
          {formatMonth(month)}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="Next month"
          className="rounded-md p-1 text-ink-soft hover:bg-canvas disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DOW.map((d, i) => (
          <span
            key={i}
            className="py-1 text-center text-[10px] font-medium text-ink-faint"
          >
            {d}
          </span>
        ))}
        {cells.map((iso, i) =>
          iso === null ? (
            <span key={`pad-${i}`} />
          ) : (
            <button
              key={iso}
              type="button"
              disabled={iso < min || iso > max}
              onClick={() => onPick(iso)}
              aria-current={iso === value ? "date" : undefined}
              className={cn(
                "rounded-md py-1.5 text-center text-xs transition-colors",
                iso === value
                  ? "bg-brand font-semibold text-white"
                  : "text-ink-soft hover:bg-canvas",
                "disabled:cursor-not-allowed disabled:text-ink-faint disabled:opacity-40 disabled:hover:bg-transparent",
              )}
            >
              {parseDateOnly(iso).getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

function ListPicker({
  items,
  value,
  onPick,
}: {
  items: { value: string; label: string }[];
  value: string;
  onPick: (iso: string) => void;
}) {
  return (
    <ul className="w-[228px]" role="listbox">
      {items.map((it) => (
        <li key={it.value}>
          <button
            type="button"
            role="option"
            aria-selected={it.value === value}
            onClick={() => onPick(it.value)}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-canvas",
              it.value === value ? "font-medium text-ink" : "text-ink-soft",
            )}
          >
            {it.label}
            {it.value === value ? (
              <Check size={15} strokeWidth={3} className="text-brand-dark" />
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Granularity and period are one control, not two.
 *
 * Each button both selects the bucket size and opens a picker for *which*
 * bucket — so "Weekly" is never an open-ended range, it is always one named
 * week. The button label carries the current selection so the header states
 * what is on screen without a second lookup.
 */
export function PeriodPicker({
  granularity,
  anchor,
  min,
  max,
  onChange,
}: {
  granularity: Granularity;
  anchor: string;
  min: string;
  max: string;
  onChange: (granularity: Granularity, anchor: string) => void;
}) {
  const [open, setOpen] = useState<Granularity | null>(null);
  const ref = usePopover(() => setOpen(null));

  /** Buckets from newest to oldest, bounded by the retention window. */
  const buildList = (g: Granularity) => {
    const startOf = g === "weekly" ? startOfWeek : startOfMonth;
    const format = g === "weekly" ? formatWeekRange : formatMonth;
    const out: { value: string; label: string }[] = [];
    let cursor = startOf(max);
    const floor = startOf(min);
    for (let i = 0; i < 60 && cursor >= floor; i++) {
      out.push({ value: cursor, label: format(cursor) });
      cursor = shiftBucket(cursor, g, -1);
    }
    return out;
  };

  const pick = (g: Granularity, iso: string) => {
    onChange(g, iso);
    setOpen(null);
  };

  /** Moving to another granularity keeps the reader near the same point in time. */
  const anchorFor = (g: Granularity) => {
    if (g === granularity) return anchor;
    if (g === "weekly") return startOfWeek(anchor);
    if (g === "monthly") return startOfMonth(anchor);
    return anchor > max ? max : anchor;
  };

  const TABS: { g: Granularity; name: string }[] = [
    { g: "daily", name: "Daily" },
    { g: "weekly", name: "Weekly" },
    { g: "monthly", name: "Monthly" },
  ];

  return (
    <div className="relative flex flex-wrap items-center gap-2" ref={ref}>
      {TABS.map(({ g, name }) => {
        const isActive = granularity === g;
        return (
          <div key={g} className="relative">
            <button
              type="button"
              onClick={() => setOpen(open === g ? null : g)}
              aria-haspopup="dialog"
              aria-expanded={open === g}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-brand bg-brand-soft text-brand-dark"
                  : "border-line bg-surface text-ink hover:bg-canvas",
              )}
            >
              <span className={cn(isActive ? "text-brand-dark" : "text-ink-muted")}>
                {name}
              </span>
              {isActive ? (
                <span className="font-medium">
                  {formatBucketLabel(anchor, g)}
                </span>
              ) : null}
              <ChevronDown
                size={15}
                className={isActive ? "text-brand-dark" : "text-ink-muted"}
              />
            </button>

            {open === g ? (
              <Panel>
                {g === "daily" ? (
                  <DayPicker
                    value={anchorFor("daily")}
                    min={min}
                    max={max}
                    onPick={(iso) => pick("daily", iso)}
                  />
                ) : (
                  <ListPicker
                    items={buildList(g)}
                    value={anchorFor(g)}
                    onPick={(iso) => pick(g, iso)}
                  />
                )}
              </Panel>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
