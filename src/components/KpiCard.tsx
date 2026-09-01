"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Users } from "lucide-react";
import { viz } from "@/lib/brand";
import { cn, formatCount, formatSignedPct } from "@/lib/cn";
import { SERIES, SeriesId } from "@/lib/metrics";
import { Skeleton } from "./ui/Skeleton";
import { InfoTip, TipRow } from "./ui/InfoTip";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 96;
  const h = 30;

  if (values.length < 2) return <svg width={w} height={h} aria-hidden="true" />;

  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const y = (v: number) => h - 2 - (v / max) * (h - 4);

  const points = values.map((v, i) => `${i * step},${y(v)}`).join(" ");
  const lastX = (values.length - 1) * step;
  const lastY = y(values[values.length - 1]);

  return (
    <svg width={w} height={h} aria-hidden="true" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 2px surface ring keeps the endpoint readable where it overlaps the line */}
      <circle cx={lastX} cy={lastY} r={3.5} fill={color} stroke="#fff" strokeWidth={2} />
    </svg>
  );
}

function Delta({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
        <Minus size={13} aria-hidden="true" />
        No prior data
      </span>
    );
  }

  const flat = Math.abs(pct) < 0.05;
  const up = pct > 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const color = flat ? undefined : up ? viz.up : viz.down;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        flat && "text-ink-muted",
      )}
      style={color ? { color } : undefined}
    >
      <Icon size={13} strokeWidth={2.5} aria-hidden="true" />
      {flat ? "No change" : formatSignedPct(pct)}
      <span className="font-normal text-ink-muted">vs. prev.</span>
    </span>
  );
}

export function KpiCard({
  seriesId,
  value,
  deltaPct,
  spark,
  loading,
  onSelect,
}: {
  seriesId: SeriesId;
  value: number;
  deltaPct: number | null;
  spark: number[];
  loading: boolean;
  /** Present = the tile opens the contacts behind the number. */
  onSelect?: () => void;
}) {
  const def = SERIES[seriesId];
  const interactive = Boolean(onSelect) && !loading;

  return (
    <article
      className={cn(
        "rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]",
        interactive &&
          "cursor-pointer transition-colors hover:border-brand-light hover:bg-brand-soft/40",
      )}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? `${def.label}: show contacts` : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ background: def.color }}
            aria-hidden="true"
          />
          <h3 className="flex items-center gap-1.5 text-sm font-medium text-ink-soft">
            <span className="truncate">{def.label}</span>
            {/* Stops the click from also opening the contact drawer behind it. */}
            <span onClick={(e) => e.stopPropagation()}>
              <InfoTip title={def.label}>
                <TipRow label="What it is">{def.tip.what}</TipRow>
                <TipRow label="How it is worked out">{def.tip.how}</TipRow>
                <TipRow label="Filters">{def.tip.filters}</TipRow>
              </InfoTip>
            </span>
          </h3>
        </div>
        {interactive ? (
          <Users
            size={14}
            className="mt-0.5 shrink-0 text-ink-faint"
            aria-hidden="true"
          />
        ) : null}
      </div>

      {loading ? (
        <Skeleton className="mt-3 h-9 w-24" />
      ) : (
        // Proportional figures on purpose — tabular-nums makes a display-size
        // number read loose.
        <p className="mt-2.5 text-[32px] leading-none font-semibold text-ink">
          {formatCount(value)}
        </p>
      )}

      <div className="mt-3 flex items-end justify-between gap-3">
        {loading ? <Skeleton className="h-4 w-28" /> : <Delta pct={deltaPct} />}
        <Sparkline values={spark} color={def.color} />
      </div>
    </article>
  );
}
