import { SERIES_SLOTS } from "./brand";

/** Raw row shape of public.metrics_daily. */
export type MetricRow = {
  metric_key: string;
  metric_date: string; // YYYY-MM-DD
  count: number;
  source: string; // "" for funnel metrics, "sms" | "call" | "email" | "form"
};

/**
 * A "series" is one line/number on the dashboard.
 *
 * Not 1:1 with metric_key: in production `ai_conversations` is a single
 * metric_key split across three channels via the `source` column, so it expands
 * into four series (total + one per channel). The handoff doc predates that
 * change — it still describes separate ai_voice_/ai_sms_ keys.
 */
export type SeriesId =
  | "form_submissions_total"
  | "game_plan_call_booked"
  | "consultation_booked"
  | "consultation_won"
  | "ai_conversations"
  | "ai_sms"
  | "ai_call"
  | "ai_email";

export type SeriesDef = {
  id: SeriesId;
  label: string;
  short: string;
  metricKey: string;
  /** null = sum every source for this metric_key. */
  source: string | null;
  color: string;
  hint: string;
};

/**
 * Categorical slots are assigned in fixed order, top of funnel downward, then
 * AI. Never cycle or re-assign: a reader who learned "orange = Game Plan Calls"
 * must keep that mapping when other series are toggled off.
 */
export const SERIES: Record<SeriesId, SeriesDef> = {
  form_submissions_total: {
    id: "form_submissions_total",
    label: "Form Submissions",
    short: "Forms",
    metricKey: "form_submissions_total",
    source: null,
    color: SERIES_SLOTS[0],
    hint: "Total form submissions captured in GoHighLevel",
  },
  game_plan_call_booked: {
    id: "game_plan_call_booked",
    label: "Game Plan Calls Booked",
    short: "Game Plan Calls",
    metricKey: "game_plan_call_booked",
    source: null,
    color: SERIES_SLOTS[1],
    hint: "Opportunities entering the “Lead Booked 15 min Call” stage",
  },
  consultation_booked: {
    id: "consultation_booked",
    label: "$100 Consultations Booked",
    short: "Consults Booked",
    metricKey: "consultation_booked",
    source: null,
    color: SERIES_SLOTS[2],
    hint: "Opportunities entering the “Paid Consultation Requested” stage",
  },
  consultation_won: {
    id: "consultation_won",
    label: "Consultations Won",
    short: "Consults Won",
    metricKey: "consultation_won",
    source: null,
    color: SERIES_SLOTS[3],
    hint: "Opportunities entering “Closed Won” — signed up for a program",
  },
  ai_conversations: {
    id: "ai_conversations",
    label: "AI Conversations",
    short: "AI Conversations",
    metricKey: "ai_conversations",
    source: null,
    color: SERIES_SLOTS[4],
    hint: "All AI-started conversations across SMS, voice and email",
  },

  // Channels live in their own card with their own legend, so they restart at
  // slot 1 rather than continuing the trend chart's sequence.
  ai_sms: {
    id: "ai_sms",
    label: "SMS",
    short: "SMS",
    metricKey: "ai_conversations",
    source: "sms",
    color: SERIES_SLOTS[0],
    hint: "AI conversations started over SMS",
  },
  ai_call: {
    id: "ai_call",
    label: "Voice",
    short: "Voice",
    metricKey: "ai_conversations",
    source: "call",
    color: SERIES_SLOTS[1],
    hint: "AI conversations started over voice call",
  },
  ai_email: {
    id: "ai_email",
    label: "Email",
    short: "Email",
    metricKey: "ai_conversations",
    source: "email",
    color: SERIES_SLOTS[2],
    hint: "AI conversations started over email",
  },
};

/** Headline stat tiles, in funnel order. */
export const KPI_SERIES: SeriesId[] = [
  "form_submissions_total",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
];

/** Channels in the AI part-to-whole bar. */
export const AI_CHANNELS: SeriesId[] = ["ai_sms", "ai_call", "ai_email"];

/** Everything selectable on the trend chart. */
export const CHART_SERIES: SeriesId[] = [
  "form_submissions_total",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
  "ai_conversations",
];

/** The lead-to-member funnel, top to bottom. Order carries meaning. */
export const FUNNEL_SERIES: SeriesId[] = [
  "form_submissions_total",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
];

/** Every series that appears in the breakdown table. */
export const TABLE_SERIES: SeriesId[] = [
  "form_submissions_total",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
  "ai_sms",
  "ai_call",
  "ai_email",
];

export function rowMatches(row: MetricRow, def: SeriesDef): boolean {
  if (row.metric_key !== def.metricKey) return false;
  if (def.source === null) return true;
  return row.source === def.source;
}
