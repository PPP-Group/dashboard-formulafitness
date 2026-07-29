"use client";

import { Check, ChevronDown, Download, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Granularity } from "@/lib/aggregate";
import { cn } from "@/lib/cn";
import { Logo } from "./Sidebar";

export type RangePreset = 7 | 30 | 90;

const RANGES: { value: RangePreset; label: string }[] = [
  { value: 7, label: "Last 7 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function RangePicker({
  value,
  onChange,
}: {
  value: RangePreset;
  onChange: (v: RangePreset) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = RANGES.find((r) => r.value === value)!;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas"
      >
        {current.label}
        <ChevronDown size={15} className="text-ink-muted" />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1.5 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          {RANGES.map((r) => (
            <li key={r.value}>
              <button
                type="button"
                role="option"
                aria-selected={r.value === value}
                onClick={() => {
                  onChange(r.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-canvas"
              >
                {r.label}
                {r.value === value ? (
                  <Check size={16} strokeWidth={3} className="text-brand-dark" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function GranularityToggle({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (v: Granularity) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Granularity"
      className="flex rounded-lg border border-line bg-surface p-0.5"
    >
      {GRANULARITIES.map((g) => (
        <button
          key={g.value}
          type="button"
          aria-pressed={g.value === value}
          onClick={() => onChange(g.value)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm transition-colors",
            g.value === value
              ? "bg-brand-soft font-medium text-brand-dark"
              : "text-ink-soft hover:text-ink",
          )}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}

function freshness(at: Date | null): string {
  if (!at) return "Loading…";
  const secs = Math.floor((Date.now() - at.getTime()) / 1000);
  if (secs < 60) return "Updated just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `Updated ${hrs}h ago`;
}

export function Topbar({
  range,
  onRangeChange,
  granularity,
  onGranularityChange,
  lastUpdated,
  loading,
  onRefresh,
  onExport,
}: {
  range: RangePreset;
  onRangeChange: (v: RangePreset) => void;
  granularity: Granularity;
  onGranularityChange: (v: Granularity) => void;
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
}) {
  // Re-render the "x min ago" label without refetching.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-canvas/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-2.5 lg:hidden">
          <Logo size={30} />
        </div>

        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-semibold text-ink">Dashboard</h1>
          <p
            className="truncate text-xs text-ink-muted"
            aria-live="polite"
            suppressHydrationWarning
          >
            {freshness(lastUpdated)} · auto-refresh every minute
          </p>
        </div>

        <GranularityToggle
          value={granularity}
          onChange={onGranularityChange}
        />
        <RangePicker value={range} onChange={onRangeChange} />

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors hover:bg-canvas disabled:opacity-60"
        >
          <RefreshCw
            size={15}
            className={cn("text-ink-muted", loading && "animate-spin")}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>

        <button
          type="button"
          onClick={onExport}
          className="flex items-center gap-2 rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>
    </header>
  );
}
