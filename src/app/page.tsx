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
import {
  addDays,
  bucketBounds,
  formatBucketLabel,
  shiftBucket,
  todayInGymTz,
} from "@/lib/dates";
import {
  AI_CHANNELS,
  CHART_SERIES,
  FUNNEL_SERIES,
  KPI_SERIES,
  LEAD_SOURCES,
  SourceSelection,
  TABLE_SERIES,
  humanizeSource,
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
import { Topbar } from "@/components/Topbar";
import { TrendChart } from "@/components/TrendChart";
import { WeekdayCard } from "@/components/WeekdayCard";

const LEADS_KEY = "form_submissions_total";
const AI_KEY = "ai_conversations";

/** Retention is 90 days, so nothing older is offerable in the pickers. */
const RETENTION_DAYS = 90;

/** How many buckets of history the trend chart shows behind the selected one. */
const TRAIL: Record<Granularity, number> = {
  daily: 30,
  weekly: 12,
  monthly: 12,
};

export default function DashboardPage() {
  const { rows, loading, error, lastUpdated, refresh } = useMetrics();
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [anchor, setAnchor] = useState<string>(() => todayInGymTz());
  const [leadSource, setLeadSource] = useState<string | null>(null);

  // First load shows skeletons; later polls hold the previous render instead.
  const firstLoad = loading && rows.length === 0 && !error;
  const refetching = loading && rows.length > 0;

  const today = todayInGymTz();
  const minDate = addDays(today, -(RETENTION_DAYS - 1));

  const view = useMemo(() => {
    // The selected bucket is what every headline number reports on.
    const sel = bucketBounds(anchor, granularity);
    const from = sel.start;
    // Never plot past today: a half-elapsed week shouldn't trail off into zeros.
    const to = sel.end > today ? today : sel.end;

    const prev = bucketBounds(shiftBucket(anchor, granularity, -1), granularity);

    // The chart needs more than one point to be a chart, so it shows the
    // buckets leading up to the selected one — clamped to the retention floor,
    // since buckets older than that are guaranteed empty and would just pad the
    // axis with zeros.
    const trailStart = bucketBounds(
      shiftBucket(anchor, granularity, -(TRAIL[granularity] - 1)),
      granularity,
    ).start;
    const retentionFloor = bucketBounds(minDate, granularity).start;
    const windowStart = trailStart < retentionFloor ? retentionFloor : trailStart;

    /**
     * `form_submissions_total` is the ONLY metric carrying an origin breakdown.
     * So a lead-origin filter can scope the Leads metric and nothing else — it
     * is applied where Leads stands on its own (its KPI tile, its line on the
     * chart, its table column) and deliberately NOT to anything that puts Leads
     * side by side with another metric.
     *
     * Mixing the two scopes is what produced a 200% booking rate: a filtered
     * denominator (leads from one origin) under an unfilterable numerator (all
     * Game Plan calls). Those cards read unfiltered totals and say so.
     */
    const selection: SourceSelection = { leads_created: leadSource };

    const spark = buildChartData(
      rows,
      KPI_SERIES,
      windowStart,
      to,
      "daily",
      selection,
    );

    const kpis = KPI_SERIES.map((id) => {
      const current = sumInRange(rows, id, from, to, selection);
      const previous = sumInRange(rows, id, prev.start, prev.end, selection);
      return {
        id,
        value: current,
        delta: deltaPct(current, previous),
        spark: spark.map((p) => p[id] as number),
      };
    });

    // Weekday needs a span to be meaningful, so it reads the trend window
    // rather than the selected bucket. Cross-metric sum → no origin filter.
    const weekday = FUNNEL_SERIES.map((id) =>
      buildWeekdayData(rows, id, windowStart, to),
    ).reduce((acc, cur) => acc.map((v, i) => v + cur[i]), new Array(7).fill(0));

    const leadTotals = sumBySource(rows, LEADS_KEY, from, to);

    const leadSourceOptions = [
      { value: null as string | null, label: "All origins" },
      ...mergeSources(LEAD_SOURCES, Object.keys(leadTotals)).map((s) => ({
        value: s.value as string | null,
        label: s.label,
      })),
    ];

    return {
      from,
      to,
      windowStart,
      kpis,
      weekday,
      leadTotals,
      leadSourceOptions,
      tableRows: buildTableData(
        rows,
        TABLE_SERIES,
        windowStart,
        to,
        granularity,
        selection,
      ),
      chart: buildChartData(
        rows,
        CHART_SERIES,
        windowStart,
        to,
        granularity,
        selection,
      ),
      detail: buildSourceDetail(
        rows,
        [
          LEADS_KEY,
          AI_KEY,
          "game_plan_call_booked",
          "consultation_booked",
          "consultation_won",
        ],
        windowStart,
        to,
        granularity,
      ),
      // Cross-metric comparisons: unfiltered on both sides, always.
      funnel: FUNNEL_SERIES.map((id) => sumInRange(rows, id, from, to)),
      ai: AI_CHANNELS.map((id) => sumInRange(rows, id, from, to)),
      calls: sumInRange(rows, "game_plan_call_booked", from, to),
      leads: sumInRange(rows, "leads_created", from, to),
    };
  }, [rows, anchor, granularity, leadSource, today, minDate]);

  const periodLabel = formatBucketLabel(anchor, granularity);
  const filterNote = leadSource
    ? `origin: ${humanizeSource(leadSource, LEADS_KEY)}`
    : "";
  /**
   * For cross-metric views it cannot reach — saying "all origins" out loud is
   * what stops the reader assuming the filter applied here too.
   */
  const unscopedLabel = leadSource
    ? `${periodLabel} · all origins`
    : periodLabel;

  // Counted from what actually rendered, so the caption can't overstate the span.
  const unit =
    granularity === "daily" ? "day" : granularity === "weekly" ? "week" : "month";
  const spanCount = view.chart.length;
  const trendLabel = `${spanCount} ${unit}${spanCount === 1 ? "" : "s"} up to ${periodLabel}`;

  const handlePeriodChange = (g: Granularity, next: string) => {
    setGranularity(g);
    setAnchor(next);
  };

  const handleExport = () =>
    downloadCsv(
      `formula-fitness-${granularity}-${view.windowStart}-to-${view.to}.csv`,
      toCsv(view.tableRows, TABLE_SERIES, view.detail),
    );

  return (
    <div className="flex min-h-full justify-center">
      {/* Capped width now that there's no sidebar eating the left edge. */}
      <div className="flex min-w-0 flex-1 flex-col 2xl:max-w-[1600px]">
        <Topbar
          granularity={granularity}
          anchor={anchor}
          minDate={minDate}
          maxDate={today}
          onPeriodChange={handlePeriodChange}
          leadSource={leadSource}
          onLeadSourceChange={setLeadSource}
          leadSourceOptions={view.leadSourceOptions}
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
              subtitle={filterNote ? `${trendLabel} · ${filterNote}` : trendLabel}
            />
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <section id="funnel" className="scroll-mt-32">
              <h2 className="sr-only">Stage volume</h2>
              <FunnelCard
                totals={view.funnel}
                loading={firstLoad}
                refetching={refetching}
                subtitle={unscopedLabel}
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
              originFilterActive={!!leadSource}
              loading={firstLoad}
              refetching={refetching}
              subtitle={unscopedLabel}
            />
            <div className="lg:col-span-2">
              <WeekdayCard
                totals={view.weekday}
                loading={firstLoad}
                refetching={refetching}
                subtitle={`Pipeline activity · ${trendLabel}${leadSource ? " · all origins" : ""}`}
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
              subtitle={filterNote ? `${trendLabel} · ${filterNote}` : trendLabel}
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
