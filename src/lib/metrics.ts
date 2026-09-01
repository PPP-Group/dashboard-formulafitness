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
  /**
   * The three things a person needs to trust a number: what it counts, where
   * the count comes from, and what the pickers at the top do to it. Rendered
   * in the "i" tip beside the label.
   */
  tip: { what: string; how: string; filters: string };
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
    tip: {
      what: "Every opportunity created in the pipeline, which is one per form fill, inbound SMS, QR scan or AI voice call.",
      how: "Counted on the day the opportunity was created in GoHighLevel, in Los Alamitos time. Rebuilt from the pipeline itself, so it matches what you would count by hand.",
      filters: "The period picker chooses which creation dates are counted. The origin filter narrows it to one lead source. Click the card for the contacts behind it.",
    },
  },
  game_plan_call_booked: {
    id: "game_plan_call_booked",
    label: "Game Plan Calls Booked",
    short: "Game Plan Calls",
    metricKey: "game_plan_call_booked",
    source: null,
    color: SERIES_SLOTS[1],
    hint: "Game plan calls booked, counted from the calendar on the day they were booked",
    tip: {
      what: "Free 15 minute game plan calls that were booked, whether or not they were later held or cancelled.",
      how: "Counted from the calendar, on the day the appointment was made. Not from the pipeline stage: an opportunity that moved past that stage stops sitting in it, and its booking would vanish from the history.",
      filters: "The period picker chooses which booking dates are counted. The origin filter uses the lead origin of the contact who booked. Click the card for the contacts behind it.",
    },
  },
  consultation_booked: {
    id: "consultation_booked",
    label: "$100 Consultations Booked",
    short: "Consults Booked",
    metricKey: "consultation_booked",
    source: null,
    color: SERIES_SLOTS[2],
    hint: "Paid consultations booked, counted from the calendar on the day they were booked",
    tip: {
      what: "Paid $100 initial consultations that were booked, whether or not they were later held or cancelled.",
      how: "Counted from the consultation calendar, on the day the appointment was made, for the same reason as the game plan call.",
      filters: "The period picker chooses which booking dates are counted. The origin filter uses the lead origin of the contact who booked. Click the card for the contacts behind it.",
    },
  },
  consultation_won: {
    id: "consultation_won",
    label: "Closed Won",
    short: "Closed Won",
    // metric_key is unchanged — only the label shown to the client changed.
    metricKey: "consultation_won",
    source: null,
    color: SERIES_SLOTS[3],
    hint: "Opportunities entering the “Closed Won” stage — signed up for a program",
    tip: {
      what: "Opportunities that reached Closed Won, meaning the person signed up for a program.",
      how: "Counted on the day the opportunity entered Closed Won. Won is a final stage, so nobody leaves it and the history stays intact.",
      filters: "The period picker chooses which closing dates are counted. The origin filter narrows it to one lead source. Click the card for the contacts behind it.",
    },
  },
  ai_conversations: {
    id: "ai_conversations",
    label: "AI Conversations",
    short: "AI Conversations",
    metricKey: "ai_conversations",
    source: null,
    color: SERIES_SLOTS[4],
    hint: "AI activations across voice, SMS and email — the first time a lead writes in on a channel, and every voice call",
    tip: {
      what: "How many times the conversation AI was switched on across voice, SMS and email.",
      how: "The AI switches on the first time a lead writes in on a channel. A second message on the same channel continues that conversation and does not count again; writing in on a different channel does. Every voice call counts.",
      filters: "The period picker chooses which activation dates are counted. The origin filter does not apply. Click a channel for the contacts behind it.",
    },
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
    // One activation per conversation per day, not one per message — a
    // back-and-forth thread with 10 texts counts once, the same as one with 1.
    hint: "The first inbound SMS from a contact, which is what switches the AI on",
    tip: {
      what: "The AI switching on over SMS.",
      how: "The first inbound SMS from a contact. Later messages on SMS continue that conversation.",
      filters: "The period picker chooses which activation dates are counted.",
    },
  },
  ai_call: {
    id: "ai_call",
    label: "Voice",
    short: "Voice",
    metricKey: "ai_conversations",
    source: "call",
    color: SERIES_SLOTS[1],
    hint: "Voice calls, each one an activation of the voice AI",
    tip: {
      what: "The AI switching on over a voice call.",
      how: "One per call, inbound or outbound, because each call is its own conversation.",
      filters: "The period picker chooses which call dates are counted.",
    },
  },
  ai_email: {
    id: "ai_email",
    label: "Email",
    short: "Email",
    metricKey: "ai_conversations",
    source: "email",
    color: SERIES_SLOTS[2],
    // Same per-conversation-per-day counting as SMS.
    hint: "The first inbound email from a contact, which is what switches the AI on",
    tip: {
      what: "The AI switching on over email.",
      how: "The first inbound email from a contact. Later emails continue that conversation.",
      filters: "The period picker chooses which activation dates are counted.",
    },
  },
};

/**
 * The metric_keys the cards on this page are built from.
 *
 * `metrics_daily` is a shared table and the collection workflows keep adding
 * keys to it (per-message engagement is one row per message per day, an order
 * of magnitude denser than these). The main fetch names what it needs so a new
 * key can never silently inflate this page's payload.
 */
export const CORE_METRIC_KEYS = [
  "form_submissions_total",
  "game_plan_call_booked",
  "consultation_booked",
  "consultation_won",
  "ai_conversations",
] as const;

export type SourceOption = { value: string; label: string };

/**
 * The ways a lead can arrive. Slugs match exactly what the n8n workflow writes
 * into `source`, which in turn maps the literal `source` strings GoHighLevel
 * returns on an opportunity — verified against the live API on 2026-07-30.
 *
 * Two labels are shortened from the GHL originals:
 *   "Tony Tran Old Lead" → "Old Lead"  (the prefix carried no meaning here)
 *   "Tony Tran Website"  → kept in full, because shortening it to "Website"
 *                          would read as a duplicate of "Website Form" while
 *                          being a different origin entirely.
 *
 * `email_inbound` is the one entry with no data yet: it is on the client's
 * list and mapped in the workflow, but no opportunity has arrived through it.
 *
 * A starting list, not a closed set — anything the workflow writes that isn't
 * here still renders (see `mergeSources`), so an unplanned origin never
 * silently vanishes from a total.
 */
export const LEAD_SOURCES: SourceOption[] = [
  { value: "website_form", label: "Website Form" },
  { value: "ai_voice_call", label: "AI Voice Call" },
  { value: "sms_inbound", label: "SMS Inbound" },
  { value: "qr_code", label: "QR Code" },
  { value: "referral", label: "Referral" },
  { value: "old_lead", label: "Old Lead" },
  { value: "tony_tran_website", label: "Tony Tran Website" },
  { value: "email_inbound", label: "Email Inbound" },
];

export const AI_CHANNEL_SOURCES: SourceOption[] = [
  { value: "call", label: "Voice" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

/**
 * `source` means different things per metric, and the vocabularies overlap:
 * `call` is "AI Voice Call" as a lead origin but "Voice" as a conversation
 * channel. Labels are therefore looked up per metric, never globally.
 */
const SOURCE_LABELS: Record<string, SourceOption[]> = {
  form_submissions_total: LEAD_SOURCES,
  ai_conversations: AI_CHANNEL_SOURCES,
};

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Label for a `source` value. Pass `metricKey` wherever it's known — without it
 * an overlapping slug resolves to whichever vocabulary is checked first.
 */
export function humanizeSource(value: string, metricKey?: string): string {
  const list = metricKey
    ? (SOURCE_LABELS[metricKey] ?? [])
    : [...LEAD_SOURCES, ...AI_CHANNEL_SOURCES];
  return list.find((s) => s.value === value)?.label ?? titleCase(value);
}

/**
 * Known categories first (stable order), then anything else the data contains.
 * Keeps the card readable while guaranteeing nothing is dropped. Extras are
 * title-cased rather than looked up — by definition they belong to no
 * vocabulary.
 */
export function mergeSources(
  known: SourceOption[],
  present: string[],
): SourceOption[] {
  const extra = present
    .filter((p) => p !== "" && !known.some((k) => k.value === p))
    .sort()
    .map((value) => ({ value, label: titleCase(value) }));
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
