"use client";

import { Check, ChevronDown, Download, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Granularity } from "@/lib/aggregate";
import { cn } from "@/lib/cn";
import { Logo } from "./Sidebar";
import { PeriodPicker } from "./PeriodPicker";

type Option<T> = { value: T; label: string };

/** Preset-list dropdown: selection marked by a check, custom rows, no native select. */
function Dropdown<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

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

  const current = options.find((o) => o.value === value) ?? options[0];
  const isFiltered = value !== options[0].value;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={id}
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
          isFiltered
            ? "border-brand bg-brand-soft text-brand-dark"
            : "border-line bg-surface text-ink hover:bg-canvas",
        )}
      >
        <span id={id} className="text-ink-muted">
          {label}:
        </span>
        <span className="font-medium">{current.label}</span>
        <ChevronDown size={15} className="text-ink-muted" />
      </button>

      {open ? (
        <ul
          role="listbox"
          className="thin-scroll absolute right-0 z-20 mt-1.5 max-h-72 w-52 overflow-auto rounded-xl border border-line bg-surface py-1 shadow-lg"
        >
          {options.map((o) => (
            <li key={String(o.value)}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-canvas"
              >
                {o.label}
                {o.value === value ? (
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

function freshness(at: Date | null): string {
  if (!at) return "Loading…";
  const secs = Math.floor((Date.now() - at.getTime()) / 1000);
  if (secs < 60) return "Updated just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Updated ${mins} min ago`;
  return `Updated ${Math.floor(mins / 60)}h ago`;
}

export function Topbar({
  granularity,
  anchor,
  minDate,
  maxDate,
  onPeriodChange,
  leadSource,
  onLeadSourceChange,
  leadSourceOptions,
  channel,
  onChannelChange,
  channelOptions,
  lastUpdated,
  loading,
  onRefresh,
  onExport,
}: {
  granularity: Granularity;
  anchor: string;
  minDate: string;
  maxDate: string;
  onPeriodChange: (g: Granularity, anchor: string) => void;
  leadSource: string | null;
  onLeadSourceChange: (v: string | null) => void;
  leadSourceOptions: Option<string | null>[];
  channel: string | null;
  onChannelChange: (v: string | null) => void;
  channelOptions: Option<string | null>[];
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
      <div className="flex items-center gap-3 px-4 pt-3.5 sm:px-6">
        <div className="lg:hidden">
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

      {/* One filter row, above everything it scopes. */}
      <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 sm:px-6">
        <PeriodPicker
          granularity={granularity}
          anchor={anchor}
          min={minDate}
          max={maxDate}
          onChange={onPeriodChange}
        />
        <Dropdown
          label="Lead origin"
          value={leadSource}
          options={leadSourceOptions}
          onChange={onLeadSourceChange}
        />
        <Dropdown
          label="Channel"
          value={channel}
          options={channelOptions}
          onChange={onChannelChange}
        />
      </div>
    </header>
  );
}
