"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Granularity,
  buildChartData,
  buildTableData,
  buildWeekdayData,
  deltaPct,
  sumInRange,
} from "@/lib/aggregate";
import { addDays, formatLong, todayInGymTz } from "@/lib/dates";
import {
  AI_CHANNELS,
  CHART_SERIES,
  FUNNEL_SERIES,
  KPI_SERIES,
  TABLE_SERIES,
} from "@/lib/metrics";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useMetrics } from "@/hooks/useMetrics";
import { AiChannelsCard } from "@/components/AiChannelsCard";
import { BookingRateMeter } from "@/components/BookingRateMeter";
import { BreakdownTable } from "@/components/BreakdownTable";
import { FunnelCard } from "@/components/FunnelCard";
import { KpiCard } from "@/components/KpiCard";
import { Sidebar } from "@/components/Sidebar";
import { RangePreset, Topbar } from "@/components/Topbar";
import { TrendChart } from "@/components/TrendChart";
import { WeekdayCard } from "@/components/WeekdayCard";

export default function DashboardPage() {
  const { rows, loading, error, lastUpdated, refresh } = useMetrics();
  const [range, setRange] = useState<RangePreset>(30);
  const [granularity, setGranularity] = useState<Granularity>("daily");

  // First load shows skeletons; later polls hold the previous render instead.
  const firstLoad = loading && rows.length === 0 && !error;
  const refetching = loading && rows.length > 0;

  const view = useMemo(() => {
    const to = todayInGymTz();
    const from = addDays(to, -(range - 1));
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(range - 1));

    const spark = buildChartData(rows, KPI_SERIES, from, to, "daily");

    const kpis = KPI_SERIES.map((id) => {
      const current = sumInRange(rows, id, from, to);
      const previous = sumInRange(rows, id, prevFrom, prevTo);
      return {
        id,
        value: current,
        delta: deltaPct(current, previous),
        spark: spark.map((p) => p[id] as number),
      };
    });

    // "Most active day" reads the whole lead funnel, not a single metric.
    const weekday = FUNNEL_SERIES.map((id) =>
      buildWeekdayData(rows, id, from, to),
    ).reduce((acc, cur) => acc.map((v, i) => v + cur[i]), new Array(7).fill(0));

    return {
      from,
      to,
      kpis,
      weekday,
      tableRows: buildTableData(rows, TABLE_SERIES, from, to, granularity),
      chart: buildChartData(rows, CHART_SERIES, from, to, granularity),
      funnel: FUNNEL_SERIES.map((id) => sumInRange(rows, id, from, to)),
      ai: AI_CHANNELS.map((id) => sumInRange(rows, id, from, to)),
      calls: sumInRange(rows, "game_plan_call_booked", from, to),
      submissions: sumInRange(rows, "form_submissions_total", from, to),
    };
  }, [rows, range, granularity]);

  const periodLabel = `${formatLong(view.from)} — ${formatLong(view.to)}`;

  const handleExport = () =>
    downloadCsv(
      `formula-fitness-${granularity}-${view.from}-to-${view.to}.csv`,
      toCsv(view.tableRows, TABLE_SERIES),
    );

  return (
    <div className="flex min-h-full">
      <Sidebar className="hidden lg:flex" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          range={range}
          onRangeChange={setRange}
          granularity={granularity}
          onGranularityChange={setGranularity}
          lastUpdated={lastUpdated}
          loading={loading}
          onRefresh={refresh}
          onExport={handleExport}
        />

        <main className="flex-1 space-y-5 px-4 py-5 sm:px-6">
          {error ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4"
            >
              <AlertTriangle
                size={18}
                className="mt-0.5 shrink-0 text-down"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  Couldn’t load metrics
                </p>
                <p className="mt-0.5 text-sm break-words text-ink-soft">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={refresh}
                  className="mt-2 text-sm font-medium text-brand-dark underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : null}

          <section id="overview" className="scroll-mt-24">
            <h2 className="sr-only">Overview</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {view.kpis.map((k) => (
                <KpiCard
                  key={k.id}
                  seriesId={k.id}
                  value={k.value}
                  deltaPct={k.delta}
                  spark={k.spark}
                  loading={firstLoad}
                />
              ))}
            </div>
          </section>

          <section id="trend" className="scroll-mt-24">
            <h2 className="sr-only">Trend</h2>
            <TrendChart
              data={view.chart}
              seriesIds={CHART_SERIES}
              loading={firstLoad}
              refetching={refetching}
              subtitle={periodLabel}
            />
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section id="funnel" className="scroll-mt-24">
              <h2 className="sr-only">Stage volume</h2>
              <FunnelCard
                totals={view.funnel}
                loading={firstLoad}
                refetching={refetching}
                subtitle={periodLabel}
              />
            </section>

            <section id="ai" className="scroll-mt-24">
              <h2 className="sr-only">AI conversations</h2>
              <AiChannelsCard
                totals={view.ai}
                loading={firstLoad}
                refetching={refetching}
                subtitle={periodLabel}
              />
            </section>

            <div className="grid grid-cols-1 gap-5">
              <BookingRateMeter
                calls={view.calls}
                submissions={view.submissions}
                loading={firstLoad}
                refetching={refetching}
                subtitle={periodLabel}
              />
              <WeekdayCard
                totals={view.weekday}
                loading={firstLoad}
                refetching={refetching}
                subtitle="Lead activity by weekday"
              />
            </div>
          </div>

          <section id="breakdown" className="scroll-mt-24">
            <h2 className="sr-only">Breakdown</h2>
            <BreakdownTable
              rows={view.tableRows}
              seriesIds={TABLE_SERIES}
              loading={firstLoad}
              refetching={refetching}
              subtitle={`${periodLabel} · ${granularity}`}
            />
          </section>

          <p className="pb-2 text-center text-xs text-ink-muted">
            Collected hourly from GoHighLevel via n8n · roughly 90 days of
            history retained
          </p>
        </main>
      </div>
    </div>
  );
}
