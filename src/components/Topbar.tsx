"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Granularity } from "@/lib/aggregate";
import { cn } from "@/lib/cn";
import { brand } from "@/lib/brand";
import { Logo } from "./Logo";
import { PeriodPicker } from "./PeriodPicker";

function freshness(at: Date | null): string {
  if (!at) return "Loading…";
  const secs = Math.floor((Date.now() - at.getTime()) / 1000);
  if (secs < 60) return "Updated just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `Updated ${mins} min ago`;
  return `Updated ${Math.floor(mins / 60)}h ago`;
}

/**
 * Active-filter chip.
 *
 * The lead-origin filter is set from inside the breakdown card, where the
 * categories and their numbers already live — a second copy of that list as a
 * dropdown up here only cost header height, which on a phone is the scarcest
 * space on the page. The chip exists so a filter set further down the page is
 * still visible (and clearable) from the top; when nothing is filtered it
 * renders nothing at all.
 */
function FilterChip({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand bg-brand-soft py-1 pr-1 pl-2.5 text-xs text-brand-dark">
      <span className="text-ink-muted">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label.toLowerCase()} filter`}
        className="rounded-full p-0.5 transition-colors hover:bg-white/70"
      >
        <X size={13} strokeWidth={2.5} />
      </button>
    </span>
  );
}

export function Topbar({
  granularity,
  anchor,
  minDate,
  maxDate,
  onPeriodChange,
  leadSource,
  onClearLeadSource,
  leadSourceLabel,
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
  onClearLeadSource: () => void;
  leadSourceLabel: string;
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
        {/* The brand lives here now that the sidebar is gone. */}
        <Logo size={38} />

        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg leading-tight font-semibold text-ink">
            {brand.name}
          </h1>
          <p
            className="truncate text-xs text-ink-muted"
            aria-live="polite"
            suppressHydrationWarning
          >
            Metrics dashboard · {freshness(lastUpdated)}
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

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        <PeriodPicker
          granularity={granularity}
          anchor={anchor}
          min={minDate}
          max={maxDate}
          onChange={onPeriodChange}
        />

        {leadSource ? (
          <FilterChip
            label="Origin"
            value={leadSourceLabel}
            onClear={onClearLeadSource}
          />
        ) : null}
      </div>
    </header>
  );
}
