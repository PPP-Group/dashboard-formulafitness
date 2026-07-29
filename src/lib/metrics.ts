import { SERIES_SLOTS } from "./brand";

/** Raw row shape of public.metrics_daily. */
export type MetricRow = {
  metric_key: string;
  metric_date: string; // YYYY-MM-DD
  count: number;
  source: string; // "" when the metric has no breakdown
};

/**
 * `source` is a generic breakdown dimension, reused per metric — it is NOT
 * always "where the lead came from". Metrics without a breakdown store an empty
 * string, never null.
 */
export type SeriesId =
  | "leads_created"
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
 * Categorical slots are assigned in fixed order and never cycled: a reader who
 * learned "orange = Game Plan Calls" keeps that mapping when other series are
 * toggled off.
 */
export const SERIES: Record<SeriesId, SeriesDef> = {
  leads_created: {
    id: "leads_created",
    label: "Leads Created",
    short: "Leads",
    // The metric_key still carries its original name; its meaning widened to
    // every opportunity created in the day, categorised by lead origin.
    metricKey: "form_submissions_total",
    source: null,
    color: SERIES_SLOTS[0],
    hint: "All opportunities created, broken down by lead origin",
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
    hint: "Messages exchanged across active voice, SMS and email conversations",
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
    hint: "Messages exchanged over SMS",
  },
  ai_call: {
    id: "ai_call",
    label: "Voice",
    short: "Voice",
    metricKey: "ai_conversations",
    source: "call",
    color: SERIES_SLOTS[1],
    hint: "Messages exchanged over voice calls",
  },
  ai_email: {
    id: "ai_email",
    label: "Email",
    short: "Email",
    metricKey: "ai_conversations",
    source: "email",
    color: SERIES_SLOTS[2],
    hint: "Messages exchanged over email",
  },
};

/**
 * Breakdown categories, per the handoff document.
 *
 * Treated as a starting list, not a closed set: anything the workflows write
 * that isn't here still renders (see `mergeSources`), so a new GHL origin never
 * silently disappears from the totals.
 */
export const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: "form", label: "Form" },
  { value: "qr_code", label: "QR code" },
  { value: "call", label: "Call" },
  { value: "sms", label: "SMS" },
  { value: "chat", label: "Chat" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

export const AI_CHANNEL_SOURCES: { value: string; label: string }[] = [
  { value: "call", label: "Voice" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

/** Turn an unexpected source value into something presentable. */
export function humanizeSource(value: string): string {
  const known = [...LEAD_SOURCES, ...AI_CHANNEL_SOURCES].find(
    (s) => s.value === value,
  );
  if (known) return known.label;
  return value
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Known categories first (stable order), then anything else the data contains.
 * Keeps the card readable while guaranteeing nothing is dropped.
 */
export function mergeSources(
  known: { value: string; label: string }[],
  present: string[],
): { value: string; label: string }[] {
  const extra = present
    .filter((p) => p !== "" && !known.some((k) => k.value === p))
    .sort()
    .map((value) => ({ value, label: humanizeSource(value) }));
  return [...known, ...extra];
}

/** Headline stat tiles. */
export const KPI_SERIES: SeriesId[] = [
  "leads_created",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
];

/** Channels in the AI part-to-whole bar. */
export const AI_CHANNELS: SeriesId[] = ["ai_sms", "ai_call", "ai_email"];

/** Everything selectable on the trend chart. */
export const CHART_SERIES: SeriesId[] = [
  "leads_created",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
  "ai_conversations",
];

/** The lead-to-member stages, top to bottom. Order carries meaning. */
export const FUNNEL_SERIES: SeriesId[] = [
  "leads_created",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
];

/** Columns of the breakdown table. */
export const TABLE_SERIES: SeriesId[] = [
  "leads_created",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
  "ai_sms",
  "ai_call",
  "ai_email",
];

/**
 * Per-series source override, set by the dimension filters in the top bar.
 * `undefined` for a series means "use the series' own default".
 */
export type SourceSelection = Partial<Record<SeriesId, string | null>>;

export function effectiveSource(
  def: SeriesDef,
  selection?: SourceSelection,
): string | null {
  const override = selection?.[def.id];
  return override !== undefined ? override : def.source;
}

export function rowMatches(
  row: MetricRow,
  def: SeriesDef,
  selection?: SourceSelection,
): boolean {
  if (row.metric_key !== def.metricKey) return false;
  const source = effectiveSource(def, selection);
  if (source === null) return true;
  return row.source === source;
}
