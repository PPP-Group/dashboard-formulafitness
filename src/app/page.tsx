"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  sumMetricSource,
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
  KPI_SERIES,
  LEAD_SOURCES,
  SERIES,
  SourceSelection,
  TABLE_SERIES,
  effectiveSource,
  humanizeSource,
  mergeSources,
} from "@/lib/metrics";
import { downloadCsv, toCsv } from "@/lib/csv";
import { cohortBookingRate } from "@/lib/journey";
import {
  buildEngagementSummary,
  buildEngagementSummaryByOrigin,
  buildStepPerformance,
  buildStepPerformanceByOrigin,
  OriginMap,
  StepPerformance,
  sumContactEvents,
} from "@/lib/engagement";
import { useEngagement } from "@/hooks/useEngagement";
import { useEngagementContacts } from "@/hooks/useEngagementContacts";
import { useBookingCohort } from "@/hooks/useBookingCohort";
import { useMetrics } from "@/hooks/useMetrics";
import { AiChannelsCard } from "@/components/AiChannelsCard";
import { BookingRateMeter } from "@/components/BookingRateMeter";
import { BreakdownTable } from "@/components/BreakdownTable";
import { ContactDrawer, DrillTarget } from "@/components/ContactDrawer";
import { EngagementSummaryCard } from "@/components/EngagementSummaryCard";
import { KpiCard } from "@/components/KpiCard";
import { MessagePerformanceCard } from "@/components/MessagePerformanceCard";
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

function DashboardPageInner() {
  const searchParams = useSearchParams();
  const { rows, loading, error, lastUpdated, refresh } = useMetrics();
  const {
    rows: journeyRows,
    loading: journeyLoading,
    error: journeyError,
    refresh: refreshJourney,
  } = useBookingCohort();
  // Engagement rides its own fetch: one row per message per day is far denser
  // than the pipeline counts, and it only spans the last 100 days.
  const {
    rows: engagementRows,
    loading: engagementLoading,
    refresh: refreshEngagement,
  } = useEngagement();
  // Contact-level engagement, which is the only way to scope the AI and message
  // cards by lead origin — their `source` holds the channel or the message, so
  // the origin has to come from the person.
  const {
    rows: engagementContacts,
    unavailable: originScopeUnavailable,
  } = useEngagementContacts();

  // Which number the contacts popup is currently open for.
  const [drill, setDrill] = useState<DrillTarget | null>(null);

  const today = todayInGymTz();
  const minDate = addDays(today, -(RETENTION_DAYS - 1));

  // Lets a report link (email/Slack) open the dashboard already scoped to the
  // period it summarized, instead of always landing on "today".
  const paramGranularity = searchParams.get("granularity");
  const initialGranularity: Granularity =
    paramGranularity === "daily" ||
    paramGranularity === "weekly" ||
    paramGranularity === "monthly"
      ? paramGranularity
      : "daily";
  const paramAnchor = searchParams.get("anchor");
  const initialAnchor: string =
    paramAnchor && /^\d{4}-\d{2}-\d{2}$/.test(paramAnchor)
      ? paramAnchor < minDate
        ? minDate
        : paramAnchor > today
          ? today
          : paramAnchor
      : today;

  const [granularity, setGranularity] =
    useState<Granularity>(initialGranularity);
  const [anchor, setAnchor] = useState<string>(initialAnchor);
  const [leadSource, setLeadSource] = useState<string | null>(null);

  // First load shows skeletons; later polls hold the previous render instead.
  const firstLoad = loading && rows.length === 0 && !error;
  const refetching = loading && rows.length > 0;
  // The cohort loads on its own schedule — a fresh table starts empty and
  // fills in as the sync workflow runs, independent of metrics_daily.
  const journeyFirstLoad =
    journeyLoading && journeyRows.length === 0 && !journeyError;
  const journeyRefetching = journeyLoading && journeyRows.length > 0;
  const engagementFirstLoad = engagementLoading && engagementRows.length === 0;
  const engagementRefetching = engagementLoading && engagementRows.length > 0;

  /**
   * Contact to lead origin, read off the rows behind Leads Created. Latest
   * opportunity wins where somebody has more than one, so a lead who came back
   * through a different route is counted as they most recently arrived.
   */
  const origins: OriginMap = useMemo(() => {
    const map = new Map<string, { source: string; date: string }>();
    for (const r of journeyRows) {
      if (r.metric_key !== "form_submissions_total") continue;
      const seen = map.get(r.ghl_contact_id);
      if (!seen || r.metric_date > seen.date) {
        map.set(r.ghl_contact_id, { source: r.source, date: r.metric_date });
      }
    }
    return new Map([...map].map(([id, v]) => [id, v.source]));
  }, [journeyRows]);

  /**
   * Whether the message and AI cards can honour the origin filter. They need
   * the contact rows; without them the cards keep showing unfiltered totals
   * and say so, rather than rendering zeros.
   */
  const scopeByContact =
    leadSource !== null && !originScopeUnavailable && engagementContacts.length > 0;

  /**
   * Every pipeline metric carries the lead origin in `source`: the pipeline
   * sync resolves the opportunity's origin and writes it on the booking and
   * the close, not only on the lead. So the origin filter scopes all four of
   * them together — filtered numerator over filtered denominator, which is
   * what keeps a rate honest.
   *
   * The AI and message metrics are the exception. Their `source` is the
   * channel or the message fingerprint, so there is nothing here for an origin
   * to match on; those are filtered by contact instead, further down.
   */
  const selection: SourceSelection = useMemo(
    () => ({
      leads_created: leadSource,
      game_plan_call_booked: leadSource,
      consultation_booked: leadSource,
      consultation_won: leadSource,
    }),
    [leadSource],
  );

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
    // rather than the selected bucket. Measures lead arrivals only — not a
    // sum across the pipeline — so it answers "which day do leads show up",
    // not some blend of unrelated stage counts. Single-metric, so the origin
    // filter DOES reach it, unlike the cross-metric cards below.
    const weekday = buildWeekdayData(
      rows,
      "leads_created",
      windowStart,
      to,
      selection,
    );

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
      // The people of the selected origin, so a drill-down opened from a
      // filtered card lists the same population the number counted. Null when
      // nothing is filtered, which the drawer reads as "everyone".
      originContactIds:
        scopeByContact && leadSource
          ? [...origins].filter(([, o]) => o === leadSource).map(([id]) => id)
          : null,
      // AI activations and AI messages by channel. With an origin selected
      // these are rebuilt from the contact rows, because `source` here is the
      // channel and has no room left for the origin.
      ai: AI_CHANNELS.map((id) =>
        scopeByContact && leadSource
          ? sumContactEvents(
              engagementContacts,
              "ai_conversations",
              from,
              to,
              origins,
              leadSource,
              SERIES[id].source ?? undefined,
            )
          : sumInRange(rows, id, from, to),
      ),
      // Same three channels, but the messages sent rather than the switch-ons.
      aiInteractions: AI_CHANNELS.map((id) =>
        scopeByContact && leadSource
          ? sumContactEvents(
              engagementContacts,
              "ai_interactions",
              from,
              to,
              origins,
              leadSource,
              SERIES[id].source ?? undefined,
            )
          : sumMetricSource(rows, "ai_interactions", SERIES[id].source, from, to),
      ),
      // From metric_contacts, not the daily counts: a genuine cohort rate (booked
      // within the SAME window the lead was created), and — since
      // the contact rows carry `source` per contact — one the origin filter
      // can actually reach.
      bookingRate: cohortBookingRate(journeyRows, from, to, leadSource),
      // Per-message engagement. `step_sent` and `step_reply` are keyed by
      // which message went out, not by where the lead came from, so an origin
      // filter is answered through the contact rows instead.
      //
      // Both read the SELECTED period, like every other headline number on the
      // page. Filtering to a day and being shown a 30-day total is the card
      // answering a question nobody asked.
      //
      // The trend chart, the weekday card and the breakdown table do span the
      // window, because a line needs more than one point, a weekday
      // distribution needs several weekdays, and the table is one row per
      // bucket. A total is not one of those.
      engagement:
        scopeByContact && leadSource
          ? buildEngagementSummaryByOrigin(
              engagementContacts,
              from,
              to,
              origins,
              leadSource,
            )
          : buildEngagementSummary(engagementRows, from, to),
      steps:
        scopeByContact && leadSource
          ? buildStepPerformanceByOrigin(
              engagementContacts,
              from,
              to,
              origins,
              leadSource,
            )
          : buildStepPerformance(engagementRows, from, to),
    };
  }, [
    rows,
    journeyRows,
    engagementRows,
    anchor,
    granularity,
    leadSource,
    selection,
    origins,
    engagementContacts,
    scopeByContact,
    today,
    minDate,
  ]);

  const periodLabel = formatBucketLabel(anchor, granularity);
  const filterNote = leadSource
    ? `origin: ${humanizeSource(leadSource, LEADS_KEY)}`
    : "";

  /**
   * Caption for the cards scoped through the contact rather than through
   * `source`. It says out loud that people with no origin on file are left
   * out — an unattributed contact is not evidence for whichever origin happens
   * to be selected — and it says when the scoping is not available at all,
   * instead of showing an unfiltered total under a filtered heading.
   */
  const engagementNote = !leadSource
    ? periodLabel
    : scopeByContact
      ? `${periodLabel} · ${filterNote} · leads with a known origin only`
      : `${periodLabel} · all origins — origin detail not available yet`;

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
          loading={loading || journeyLoading}
          onRefresh={() => {
            refresh();
            refreshJourney();
            refreshEngagement();
          }}
          onExport={handleExport}
        />

        <main className="flex-1 space-y-5 px-4 py-5 sm:px-6">
          {error || journeyError ? (
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
                  {error || journeyError}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    refresh();
                    refreshJourney();
                    refreshEngagement();
                  }}
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
              {view.kpis.map((k) => {
                const def = SERIES[k.id];
                return (
                  <KpiCard
                    key={k.id}
                    seriesId={k.id}
                    value={k.value}
                    deltaPct={k.delta}
                    spark={k.spark}
                    loading={firstLoad}
                    onSelect={() =>
                      setDrill({
                        metricKey: def.metricKey,
                        label: def.label,
                        from: view.from,
                        to: view.to,
                        source: effectiveSource(def, selection),
                        periodLabel,
                      })
                    }
                  />
                );
              })}
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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
                interactions={view.aiInteractions}
                loading={firstLoad}
                refetching={refetching}
                subtitle={engagementNote}
                onSelectChannel={(channel) =>
                  setDrill({
                    metricKey: "ai_conversations",
                    label: `AI switched on over ${channel === "call" ? "voice" : channel}`,
                    from: view.from,
                    to: view.to,
                    source: channel,
                    contactIds: view.originContactIds,
                    periodLabel,
                  })
                }
              />
            </section>
          </div>

          <section id="messages" className="scroll-mt-32">
            <h2 className="sr-only">Message performance</h2>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <EngagementSummaryCard
                summary={view.engagement}
                loading={engagementFirstLoad}
                refetching={engagementRefetching}
                subtitle={engagementNote}
              />
              <div className="lg:col-span-2">
                <MessagePerformanceCard
                  steps={view.steps}
                  loading={engagementFirstLoad}
                  refetching={engagementRefetching}
                  subtitle={engagementNote}
                  onSelect={(step: StepPerformance) =>
                    setDrill({
                      metricKey: "step_reply",
                      label: `Replied to ${step.label}`,
                      from: view.from,
                      to: view.to,
                      source: step.ids,
                      contactIds: view.originContactIds,
                      periodLabel,
                    })
                  }
                />
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <BookingRateMeter
              booked={view.bookingRate.booked}
              leads={view.bookingRate.leads}
              loading={journeyFirstLoad}
              refetching={journeyRefetching}
              subtitle={filterNote ? `${periodLabel} · ${filterNote}` : periodLabel}
              onSelect={() =>
                setDrill({
                  // The numerator, not the denominator: the card asks how many
                  // of the leads booked, so clicking it has to answer "which
                  // ones". Opening the 65 leads behind the rate — including the
                  // 41 who never booked — answered a question nobody asked.
                  //
                  // The ids come from the cohort itself, so the list is exactly
                  // the people counted, with the date they booked on.
                  metricKey: "game_plan_call_booked",
                  label: "Leads from this period who booked a Game Plan call",
                  from: view.from,
                  to: view.to,
                  source: leadSource,
                  contactIds: view.bookingRate.bookedIds,
                  periodLabel,
                })
              }
            />
            <div className="lg:col-span-2">
              <WeekdayCard
                totals={view.weekday}
                loading={firstLoad}
                refetching={refetching}
                subtitle={
                  filterNote ? `${trendLabel} · ${filterNote}` : trendLabel
                }
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
        </main>
      </div>

      <ContactDrawer target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

export default function DashboardPage() {
  // useSearchParams requires a Suspense boundary above it for production
  // builds — the whole page is already client-rendered, so an empty
  // fallback is invisible in practice.
  return (
    <Suspense fallback={null}>
      <DashboardPageInner />
    </Suspense>
  );
}
