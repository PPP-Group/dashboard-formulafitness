import { MESSAGE_NAMES } from "./messageNames";
import { MetricRow } from "./metrics";
import { inRange } from "./aggregate";

/**
 * Engagement metrics live in the same `metrics_daily` table as everything else,
 * using `source` as the breakdown dimension — no new table, no migration.
 *
 * | metric_key        | source          | meaning                              |
 * |-------------------|-----------------|--------------------------------------|
 * | `step_sent`       | message id      | sends of one specific message        |
 * | `step_reply`      | message id      | replies credited to that message     |
 * | `msg_sent_auto`   | `sms` / `email` | sent by a workflow action            |
 * | `msg_sent_inbox`  | `sms` / `email` | sent from the conversation view      |
 * | `msg_reply`       | `sms` / `email` | inbound from the contact             |
 * | `msg_failed`      | `sms` / `email` | carrier rejected or never delivered  |
 * | `optout_dnd`      | `customer`      | contact switched DND on              |
 *
 * The "message id" in `source` is a fingerprint of the message body with the
 * greeting, links, digits, staff names and the contact's own name stripped, so
 * the same template reads as one message no matter who it was sent to or by.
 */
export const ENGAGEMENT_KEYS = [
  "step_sent",
  "step_reply",
  "msg_sent_auto",
  "msg_sent_inbox",
  "msg_reply",
  "msg_failed",
  "optout_dnd",
  // Same events again, carrying the lead origin. See ORIGIN_KEY below.
  "engagement_by_origin",
] as const;

export type StepPerformance = {
  /**
   * Every fingerprint stored in `source` that carries this message.
   *
   * One snippet can produce several fingerprints: the copy gets edited, or the
   * body carries a date that shifts the first six words. They are the same
   * message to the person reading the table, so they are summed into one row
   * and the drill-down queries all of them.
   */
  ids: string[];
  /** The highest-volume fingerprint in the group. Stable list key. */
  id: string;
  /** Readable form of the fingerprint. */
  label: string;
  sent: number;
  replied: number;
  /** null when nothing was sent, so the UI can omit rather than show 0%. */
  rate: number | null;
};

/**
 * The snippet name where we have one, because that is what a person can
 * actually look up in GoHighLevel.
 *
 * Retired copy has no snippet any more, so it falls back to the fingerprint
 * rendered as a phrase. The ellipses mark it as an extract of the body rather
 * than a name — a row that reads this way is telling you the message is not in
 * the library.
 */
export function humanizeFingerprint(id: string): string {
  if (!id || id === "unknown") return "Unrecognised message";
  const known = MESSAGE_NAMES[id];
  if (known) return known;
  return `…${id.split("_").join(" ")}…`;
}

/**
 * Per-message send and reply totals for a window.
 *
 * `minSends` defaults to 1: on a single-day view almost nothing clears a
 * higher bar, and hiding the day's actual sends to avoid a flattering-looking
 * small sample is the wrong trade. The table sorts by volume, not by rate, so
 * a message sent twice never sits above one sent two hundred times.
 */
export function buildStepPerformance(
  rows: MetricRow[],
  from: string,
  to: string,
  minSends = 1,
): StepPerformance[] {
  const sent = new Map<string, number>();
  const replied = new Map<string, number>();

  for (const row of rows) {
    if (!inRange(row.metric_date, from, to)) continue;
    if (row.metric_key === "step_sent") {
      sent.set(row.source, (sent.get(row.source) ?? 0) + row.count);
    } else if (row.metric_key === "step_reply") {
      replied.set(row.source, (replied.get(row.source) ?? 0) + row.count);
    }
  }

  // One snippet, one row. Grouping by label rather than by fingerprint is what
  // stops the table showing "Email: Confirmed Call" three times because the
  // copy was edited twice.
  const groups = new Map<string, { ids: string[]; sent: number; replied: number }>();
  for (const [id, sends] of sent) {
    if (sends < minSends) continue;
    const label = humanizeFingerprint(id);
    const group = groups.get(label) ?? { ids: [], sent: 0, replied: 0 };
    group.ids.push(id);
    group.sent += sends;
    group.replied += replied.get(id) ?? 0;
    groups.set(label, group);
  }

  const out: StepPerformance[] = [];
  for (const [label, group] of groups) {
    group.ids.sort((a, b) => (sent.get(b) ?? 0) - (sent.get(a) ?? 0));
    out.push({
      ids: group.ids,
      id: group.ids[0],
      label,
      sent: group.sent,
      replied: group.replied,
      rate: group.sent > 0 ? (group.replied / group.sent) * 100 : null,
    });
  }

  // Volume first: a message sent 66 times with no reply is a bigger problem
  // than one sent 4 times with no reply, and should not sort below it.
  return out.sort((a, b) => b.sent - a.sent || b.replied - a.replied);
}

/** Total for one engagement metric_key across a window, all sources. */
export function sumEngagement(
  rows: MetricRow[],
  metricKey: string,
  from: string,
  to: string,
  source?: string,
): number {
  let total = 0;
  for (const row of rows) {
    if (row.metric_key !== metricKey) continue;
    if (source !== undefined && row.source !== source) continue;
    if (!inRange(row.metric_date, from, to)) continue;
    total += row.count;
  }
  return total;
}

export type EngagementSummary = {
  automated: number;
  /**
   * Sent from the conversation view rather than by a workflow action. GHL tags
   * these `source: "app"`, which covers BOTH the Conversation AI replying and a
   * person typing — the API exposes no field that separates the two, so this
   * is deliberately not called "manual".
   */
  inbox: number;
  replies: number;
  failed: number;
  optOuts: number;
  /** Replies per automated send. Null when nothing went out. */
  replyRate: number | null;
};

export function buildEngagementSummary(
  rows: MetricRow[],
  from: string,
  to: string,
): EngagementSummary {
  const automated = sumEngagement(rows, "msg_sent_auto", from, to);
  const inbox = sumEngagement(rows, "msg_sent_inbox", from, to);
  const replies = sumEngagement(rows, "msg_reply", from, to);
  const failed = sumEngagement(rows, "msg_failed", from, to);
  const optOuts = sumEngagement(rows, "optout_dnd", from, to);

  return {
    automated,
    inbox,
    replies,
    failed,
    optOuts,
    replyRate: automated > 0 ? (replies / automated) * 100 : null,
  };
}

/**
 * The origin dimension.
 *
 * The AI and message metrics keep the channel or the message fingerprint in
 * `source`, so there is no room left in it for a lead origin. Rather than
 * change the shape of the table, the collection workflows count every event a
 * second time under one extra metric whose source carries both dimensions:
 *
 *   engagement_by_origin -> "website_form|step_sent|jessica_from_formula..."
 *
 * A contact with no opportunity on file has no origin and is counted only in
 * the plain metric. That is about a quarter of the people who exchange
 * messages, so a filtered total is deliberately smaller than the unfiltered
 * one — and the cards say so rather than implying the difference vanished.
 */
export const ORIGIN_KEY = "engagement_by_origin";

/**
 * Rows for one lead origin, rewritten to look like the plain metric they
 * mirror, so everything downstream keeps working on one row shape.
 */
export function rowsForOrigin(rows: MetricRow[], origin: string): MetricRow[] {
  const out: MetricRow[] = [];
  const prefix = `${origin}|`;
  for (const row of rows) {
    if (row.metric_key !== ORIGIN_KEY) continue;
    if (!row.source.startsWith(prefix)) continue;
    const rest = row.source.slice(prefix.length);
    const split = rest.indexOf("|");
    if (split <= 0) continue;
    out.push({
      metric_key: rest.slice(0, split),
      source: rest.slice(split + 1),
      metric_date: row.metric_date,
      count: row.count,
    });
  }
  return out;
}

/** Every origin present in the rows, so the caller can tell empty from absent. */
export function hasOriginRows(rows: MetricRow[]): boolean {
  return rows.some((r) => r.metric_key === ORIGIN_KEY);
}
