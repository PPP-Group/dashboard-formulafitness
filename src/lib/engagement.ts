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
 * | `msg_sent_auto`   | `sms` / `email` | sent by a workflow                   |
 * | `msg_sent_manual` | `sms` / `email` | typed by a person in GHL             |
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
  "msg_sent_manual",
  "msg_reply",
  "msg_failed",
  "optout_dnd",
] as const;

export type StepPerformance = {
  /** The fingerprint as stored in `source`. */
  id: string;
  /** Readable form of the fingerprint. */
  label: string;
  sent: number;
  replied: number;
  /** null when nothing was sent, so the UI can omit rather than show 0%. */
  rate: number | null;
};

/**
 * A fingerprint is lowercase words joined by underscores. Rendering it as a
 * phrase is closer to the message than a title-cased label would be, and the
 * ellipses are honest about it being an extract, not the whole text.
 */
export function humanizeFingerprint(id: string): string {
  if (!id || id === "unknown") return "Unrecognised message";
  return `…${id.split("_").join(" ")}…`;
}

/**
 * Per-message send and reply totals for a window.
 *
 * `minSends` guards against a message sent twice with one reply reading as a
 * 50% performer next to one sent 200 times.
 */
export function buildStepPerformance(
  rows: MetricRow[],
  from: string,
  to: string,
  minSends = 3,
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

  const out: StepPerformance[] = [];
  for (const [id, sends] of sent) {
    if (sends < minSends) continue;
    const got = replied.get(id) ?? 0;
    out.push({
      id,
      label: humanizeFingerprint(id),
      sent: sends,
      replied: got,
      rate: sends > 0 ? (got / sends) * 100 : null,
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
  manual: number;
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
  const manual = sumEngagement(rows, "msg_sent_manual", from, to);
  const replies = sumEngagement(rows, "msg_reply", from, to);
  const failed = sumEngagement(rows, "msg_failed", from, to);
  const optOuts = sumEngagement(rows, "optout_dnd", from, to);

  return {
    automated,
    manual,
    replies,
    failed,
    optOuts,
    replyRate: automated > 0 ? (replies / automated) * 100 : null,
  };
}
