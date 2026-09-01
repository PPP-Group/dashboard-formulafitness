"use client";

import { SERIES_SLOTS, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { EngagementSummary } from "@/lib/engagement";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { InfoTip, TipRow } from "./ui/InfoTip";

/**
 * Outbound volume split by how it was sent.
 *
 * A workflow action and a message sent from the conversation view are different
 * facts with different consequences, and `ai_conversations` counts them as one.
 *
 * The second bucket is NOT "sent by a person": GHL tags both the Conversation
 * AI and a human typing as `source: "app"`, and exposes no field that tells
 * them apart. Measured against live history, the overwhelming majority of it
 * answers the contact within 30 seconds, which is the AI, not the team.
 */
export function EngagementSummaryCard({
  summary,
  loading,
  refetching,
  subtitle,
}: {
  summary: EngagementSummary;
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  const outbound = summary.automated + summary.inbox;
  const autoShare = outbound > 0 ? (summary.automated / outbound) * 100 : 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Outbound and replies"
        subtitle={subtitle}
        info={
          <InfoTip title="Outbound and replies" align="right">
              <TipRow label="What it is">
                Everything that went out to contacts over SMS and email in the period, and what came back.
              </TipRow>
              <TipRow label="How it is worked out">
                &ldquo;Sent by a workflow&rdquo; is an automation step firing.
                &ldquo;Sent from the inbox&rdquo; is a message sent from the
                conversation view, which covers the conversation AI and anyone
                on the team; GoHighLevel does not separate the two.
              </TipRow>
              <TipRow label="Read it carefully">
                Replies are inbound messages from contacts. Failed means the carrier rejected it or never delivered it. Opted out means the contact switched do-not-disturb on.
              </TipRow>
              <TipRow label="Filters">
                The period picker chooses which days are counted. The origin filter does not apply here.
              </TipRow>
          </InfoTip>
        }
      />

      <div className={cn("px-5 pt-1 pb-5", refetching && "refetching")}>
        {loading ? (
          <>
            <Skeleton className="h-9 w-24" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-5 h-20 w-full" />
          </>
        ) : (
          <>
            <div>
              <p className="text-[32px] leading-none font-semibold text-ink">
                {summary.replyRate === null
                  ? "—"
                  : formatPct(summary.replyRate, 1)}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Replies per automated message sent
              </p>
            </div>

            <div className="mt-5">
              <div
                className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
                style={{ background: viz.track }}
                role="img"
                aria-label={`Workflow ${summary.automated}, inbox ${summary.inbox}`}
              >
                {outbound > 0 ? (
                  <>
                    <span
                      className="h-full first:rounded-l-full"
                      style={{
                        width: `${autoShare}%`,
                        background: SERIES_SLOTS[0],
                      }}
                    />
                    <span
                      className="h-full last:rounded-r-full"
                      style={{
                        width: `${100 - autoShare}%`,
                        background: viz.recessive,
                      }}
                    />
                  </>
                ) : null}
              </div>
            </div>

            {/*
              The two rows with a dot are the two segments of the bar above —
              the dot is that bar's legend. The three below are not in the bar,
              so they sit under a rule rather than borrowing a colour that
              would not mean anything.
            */}
            <ul className="mt-4 space-y-2.5">
              <Row
                color={SERIES_SLOTS[0]}
                label="Sent by a workflow"
                value={summary.automated}
              />
              <Row
                color={viz.recessive}
                label="Sent from the inbox"
                value={summary.inbox}
              />
            </ul>

            <ul className="mt-3 space-y-2.5 border-t border-line pt-3">
              <Row label="Replies received" value={summary.replies} />
              <Row
                label="Failed to deliver"
                value={summary.failed}
                tone={summary.failed > 0 ? viz.down : undefined}
              />
              <Row
                label="Opted out"
                value={summary.optOuts}
                tone={summary.optOuts > 0 ? viz.down : undefined}
              />
            </ul>

            <p className="mt-3 text-[11px] text-ink-faint">
              “From the inbox” is the Conversation AI plus anyone on the team —
              GoHighLevel does not distinguish them.
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

function Row({
  color,
  label,
  value,
  tone,
}: {
  color?: string;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {color ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: color }}
          aria-hidden="true"
        />
      ) : (
        <span className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
      )}
      <span className="text-ink-soft">{label}</span>
      <span
        className="nums ml-auto font-medium text-ink"
        style={tone ? { color: tone } : undefined}
      >
        {formatCount(value)}
      </span>
    </li>
  );
}
