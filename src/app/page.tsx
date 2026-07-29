"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  Granularity,
  buildChartData,
  buildSourceDetail,
  buildTableData,
  buildWeekdayData,
  deltaPct,
  sumBySource,
  sumInRange,
} from "@/lib/aggregate";
import { addDays, formatLong, todayInGymTz } from "@/lib/dates";
import {
  AI_CHANNELS,
  AI_CHANNEL_SOURCES,
  CHART_SERIES,
  FUNNEL_SERIES,
  KPI_SERIES,
  LEAD_SOURCES,
  SourceSelection,
  TABLE_SERIES,
  mergeSources,
} from "@/lib/metrics";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useMetrics } from "@/hooks/useMetrics";
import { AiChannelsCard } from "@/components/AiChannelsCard";
import { BookingRateMeter } from "@/components/BookingRateMeter";
import { BreakdownTable } from "@/components/BreakdownTable";
import { FunnelCard } from "@/components/FunnelCard";
import { KpiCard } from "@/components/KpiCard";
import { LeadSourceCard } from "@/components/LeadSourceCard";
import { Sidebar } from "@/components/Sidebar";
import { RangePreset, Topbar } from "@/components/Topbar";
import { TrendChart } from "@/components/TrendChart";
import { WeekdayCard } from "@/components/WeekdayCard";

const LEADS_KEY = "form_submissions_total";
const AI_KEY = "ai_conversations";

export default function DashboardPage() {
  const { rows, loading, error, lastUpdated, refresh } = useMetrics();
  const [range, setRange] = useState<RangePreset>(30);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [leadSource, setLeadSource] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(null);

  // First load shows skeletons; later polls hold the previous render instead.
  const firstLoad = loading && rows.length === 0 && !error;
  const refetching = loading && rows.length > 0;

  const view = useMemo(() => {
    const to = todayInGymTz();
    const from = addDays(to, -(range - 1));
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(range - 1));

    // Dimension filters only override the aggregate series; the per-channel
    // series ARE the breakdown and keep their own fixed source.
    const selection: SourceSelection = {
      leads_created: leadSource,
      ai_conversations: channel,
    };

    const spark = buildChartData(
      rows,
      KPI_SERIES,
      from,
      to,
      "daily",
      selection,
    );

    const kpis = KPI_SERIES.map((id) => {
      const current = sumInRange(rows, id, from, to, selection);
      const previous = sumInRange(rows, id, prevFrom, prevTo, selection);
      return {
        id,
        value: current,
        delta: deltaPct(current, previous),
        spark: spark.map((p) => p[id] as number),
      };
    });

    // "Most active day" reads the whole lead pipeline, not one metric.
    const weekday = FUNNEL_SERIES.map((id) =>
      buildWeekdayData(rows, id, from, to, selection),
    ).reduce((acc, cur) => acc.map((v, i) => v + cur[i]), new Array(7).fill(0));

    const leadTotals = sumBySource(rows, LEADS_KEY, from, to);

    // Options are driven by what the data actually contains, so a category the
    // workflows start writing tomorrow shows up without a code change.
    const leadSourceOptions = [
      { value: null, label: "All origins" },
      ...mergeSources(LEAD_SOURCES, Object.keys(leadTotals)).map((s) => ({
        value: s.value as string | null,
        label: s.label,
      })),
    ];
    const channelOptions = [
      { value: null, label: "All channels" },
      ...mergeSources(
        AI_CHANNEL_SOURCES,
        Object.keys(sumBySource(rows, AI_KEY, from, to)),
      ).map((s) => ({ value: s.value as string | null, label: s.label })),
    ];

    return {
      from,
      to,
      kpis,
      weekday,
      leadTotals,
      leadSourceOptions,
      channelOptions,
      tableRows: buildTableData(
        rows,
        TABLE_SERIES,
        from,
        to,
        granularity,
        selection,
      ),
      chart: buildChartData(
        rows,
        CHART_SERIES,
        from,
        to,
        granularity,
        selection,
      ),
      detail: buildSourceDetail(
        rows,
        [LEADS_KEY, AI_KEY, "game_plan_call_booked", "consultation_booked", "consultation_won"],
        from,
        to,
        granularity,
      ),
      funnel: FUNNEL_SERIES.map((id) =>
        sumInRange(rows, id, from, to, selection),
      ),
      ai: AI_CHANNELS.map((id) => sumInRange(rows, id, from, to)),
      calls: sumInRange(rows, "game_plan_call_booked", from, to, selection),
      leads: sumInRange(rows, "leads_created", from, to, selection),
    };
  }, [rows, range, granularity, leadSource, channel]);

  const periodLabel = `${formatLong(view.from)} — ${formatLong(view.to)}`;
  const filterNote = [
    leadSource ? `origin: ${leadSource}` : null,
    channel ? `channel: ${channel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const scopedLabel = filterNote ? `${periodLabel} · ${filterNote}` : periodLabel;

  const handleExport = () =>
    downloadCsv(
      `formula-fitness-${granularity}-${view.from}-to-${view.to}.csv`,
      toCsv(view.tableRows, TABLE_SERIES, view.detail),
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
          leadSource={leadSource}
          onLeadSourceChange={setLeadSource}
          leadSourceOptions={view.leadSourceOptions}
          channel={channel}
          onChannelChange={setChannel}
          channelOptions={view.channelOptions}
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

          <section id="overview" className="scroll-mt-32">
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

          <section id="trend" className="scroll-mt-32">
            <h2 className="sr-only">Trend</h2>
            <TrendChart
              data={view.chart}
              seriesIds={CHART_SERIES}
              loading={firstLoad}
              refetching={refetching}
              subtitle={scopedLabel}
            />
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section id="funnel" className="scroll-mt-32">
              <h2 className="sr-only">Stage volume</h2>
              <FunnelCard
                totals={view.funnel}
                loading={firstLoad}
                refetching={refetching}
                subtitle={scopedLabel}
              />
            </section>

            <section id="origins" className="scroll-mt-32">
              <h2 className="sr-only">Leads by origin</h2>
              <LeadSourceCard
                totals={view.leadTotals}
                selected={leadSource}
                onSelect={setLeadSource}
                loading={firstLoad}
                refetching={refetching}
                subtitle={periodLabel}
              />
            </section>

            <section id="ai" className="scroll-mt-32">
              <h2 className="sr-only">AI conversations</h2>
              <AiChannelsCard
                totals={view.ai}
                selected={channel}
                onSelect={setChannel}
                loading={firstLoad}
                refetching={refetching}
                subtitle={periodLabel}
              />
            </section>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <BookingRateMeter
              calls={view.calls}
              leads={view.leads}
              loading={firstLoad}
              refetching={refetching}
              subtitle={scopedLabel}
            />
            <div className="lg:col-span-2">
              <WeekdayCard
                totals={view.weekday}
                loading={firstLoad}
                refetching={refetching}
                subtitle="Pipeline activity by weekday"
              />
            </div>
          </div>

          <section id="breakdown" className="scroll-mt-32">
            <h2 className="sr-only">Breakdown</h2>
            <BreakdownTable
              rows={view.tableRows}
              seriesIds={TABLE_SERIES}
              loading={firstLoad}
              refetching={refetching}
              subtitle={`${scopedLabel} · ${granularity}`}
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
