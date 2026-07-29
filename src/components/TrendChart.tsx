"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { viz } from "@/lib/brand";
import { useElementWidth } from "@/hooks/useElementWidth";
import { ChartPoint } from "@/lib/aggregate";
import { cn, formatCount } from "@/lib/cn";
import { SERIES, SeriesId } from "@/lib/metrics";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

type TooltipEntry = { dataKey?: string | number; value?: number };

function ChartTooltip({
  active,
  payload,
  label,
  visible,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  visible: SeriesId[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-ink">{label}</p>
      <ul className="space-y-1">
        {visible.map((id) => {
          const entry = payload.find((p) => p.dataKey === id);
          if (!entry) return null;
          return (
            <li key={id} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: SERIES[id].color }}
                aria-hidden="true"
              />
              <span className="mr-3 text-ink-soft">{SERIES[id].short}</span>
              <span className="nums ml-auto font-medium text-ink">
                {formatCount(entry.value ?? 0)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TrendChart({
  data,
  seriesIds,
  loading,
  refetching,
  subtitle,
}: {
  data: ChartPoint[];
  seriesIds: SeriesId[];
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  const [box, width] = useElementWidth<HTMLDivElement>();

  // Hidden series are tracked by id, so hiding one never repaints the others.
  const [hidden, setHidden] = useState<Set<SeriesId>>(new Set());
  const visible = seriesIds.filter((id) => !hidden.has(id));

  const toggle = (id: SeriesId) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      // Never let the reader empty the chart entirely.
      else if (prev.size < seriesIds.length - 1) next.add(id);
      return next;
    });

  return (
    <Card className="flex flex-col">
      <CardHeader title="Metrics over time" subtitle={subtitle} />

      {/* Legend is always present for >= 2 series — identity is never colour-alone. */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 px-5 pb-3">
        {seriesIds.map((id) => {
          const def = SERIES[id];
          const off = hidden.has(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              aria-pressed={!off}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-opacity",
                off ? "opacity-40" : "opacity-100",
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: def.color }}
                aria-hidden="true"
              />
              <span className={cn(off ? "text-ink-muted line-through" : "text-ink-soft")}>
                {def.short}
              </span>
            </button>
          );
        })}
      </div>

      {/* min-w-0 lets the box actually shrink inside the flex column. */}
      <div
        ref={box}
        className={cn("min-w-0 px-2 pb-4", refetching && "refetching")}
      >
        {loading || width === 0 ? (
          <Skeleton className="mx-3 h-[300px]" />
        ) : (
          // Height includes the x-axis band so the labels never get clipped.
          <LineChart
            width={width}
            height={300}
            data={data}
            margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke={viz.grid} strokeWidth={1} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: viz.axis }}
              tick={{ fill: viz.muted, fontSize: 11 }}
              minTickGap={24}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: viz.muted, fontSize: 11 }}
              width={40}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: viz.axis, strokeWidth: 1 }}
              content={<ChartTooltip visible={visible} />}
            />
            {seriesIds.map((id) =>
              hidden.has(id) ? null : (
                <Line
                  key={id}
                  type="monotone"
                  dataKey={id}
                  stroke={SERIES[id].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4.5, strokeWidth: 2, stroke: "#fff" }}
                  isAnimationActive={false}
                />
              ),
            )}
          </LineChart>
        )}
      </div>
    </Card>
  );
}
