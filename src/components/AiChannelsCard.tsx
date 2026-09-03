"use client";

import { cn, formatCount, formatPct } from "@/lib/cn";
import { AI_CHANNELS, SERIES } from "@/lib/metrics";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { InfoTip, TipRow } from "./ui/InfoTip";

/**
 * Part-to-whole across the three channels. Read-only by design — the channel
 * split is information, not a filter dimension.
 *
 * Two different questions, both worth asking: how often the AI got switched on,
 * and how much work it then did. An earlier version counted a switch-on for
 * every message a lead sent, which put 2173 activations against 228 leads. A
 * lead switches the AI on the first time they write in on a channel; after
 * that they are having a conversation, not starting one. Voice is the
 * exception and every call counts, because each call is its own conversation.
 */
export function AiChannelsCard({
  totals,
  interactions,
  loading,
  refetching,
  subtitle,
  onSelectChannel,
}: {
  /** Activations per channel, in AI_CHANNELS order. */
  totals: number[];
  /** Messages sent per channel, same order. */
  interactions: number[];
  loading: boolean;
  refetching: boolean;
  subtitle: string;
  /** Opens the contacts whose first message on that channel switched it on. */
  onSelectChannel?: (channel: "sms" | "call" | "email") => void;
}) {
  const total = totals.reduce((a, b) => a + b, 0);
  const totalInteractions = interactions.reduce((a, b) => a + b, 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="AI Conversations"
        subtitle={subtitle}
        info={
          <InfoTip title="AI Conversations" align="left">
              <TipRow label="What it is">
                How many times the conversation AI was switched on, split by the channel it was switched on over.
              </TipRow>
              <TipRow label="How it is worked out">
                The AI switches on the first time a lead writes in on a channel. A second message on the same channel continues that conversation and does not count again; writing in on a different channel does. Every voice call counts, inbound or outbound.
              </TipRow>
              <TipRow label="Messages sent">
                How much the AI then did: every message sent from the conversation view on that channel, plus every call. That view covers the conversation AI and anyone on the team, and GoHighLevel does not separate the two.
              </TipRow>
              <TipRow label="Filters">
                The period picker chooses which activation dates are counted. The origin filter narrows it to the leads of one source, matched through the contact rather than the message, so leads with no origin on file are left out. Click a channel for the contacts whose first message switched it on.
              </TipRow>
          </InfoTip>
        }
      />

      {/*
        justify-between spreads the hero figure and the channel legend across
        whatever height the row settles on, instead of leaving a block of empty
        card below the content.
      */}
      <div
        className={cn(
          "flex flex-1 flex-col justify-between px-5 pt-1 pb-5",
          refetching && "refetching",
        )}
      >
        {loading ? (
          <>
            <Skeleton className="h-9 w-20" />
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-5 h-24 w-full" />
          </>
        ) : (
          <>
            <div>
              <div className="flex items-end gap-6">
                <div>
                  <p className="text-[32px] leading-none font-semibold text-ink">
                    {formatCount(total)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">Times switched on</p>
                </div>
                <div>
                  <p className="text-[22px] leading-none font-semibold text-ink-soft">
                    {formatCount(totalInteractions)}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">Messages sent</p>
                </div>
              </div>

              {/* 2px surface gaps separate segments — no borders around marks. */}
              <div
                className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-raised"
                role="img"
                aria-label={AI_CHANNELS.map(
                  (id, i) => `${SERIES[id].label}: ${totals[i] ?? 0}`,
                ).join(", ")}
              >
                {total > 0
                  ? AI_CHANNELS.map((id, i) => {
                      const v = totals[i] ?? 0;
                      if (v === 0) return null;
                      return (
                        <span
                          key={id}
                          className="h-full first:rounded-l-full last:rounded-r-full"
                          style={{
                            width: `${(v / total) * 100}%`,
                            background: SERIES[id].color,
                          }}
                        />
                      );
                    })
                  : null}
              </div>
            </div>

            {/* Legend doubles as the direct-label channel for sub-3:1 fills. */}
            <ul className="mt-5 space-y-2.5">
              {AI_CHANNELS.map((id, i) => {
                const v = totals[i] ?? 0;
                const share = total > 0 ? (v / total) * 100 : 0;
                const channel = SERIES[id].source as "sms" | "call" | "email";
                const clickable = Boolean(onSelectChannel);
                return (
                  <li
                    key={id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md text-sm",
                      clickable &&
                        "-mx-1.5 cursor-pointer px-1.5 py-0.5 hover:bg-raised",
                    )}
                    onClick={
                      clickable ? () => onSelectChannel?.(channel) : undefined
                    }
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSelectChannel?.(channel);
                            }
                          }
                        : undefined
                    }
                    tabIndex={clickable ? 0 : undefined}
                    role={clickable ? "button" : undefined}
                    aria-label={
                      clickable
                        ? `${SERIES[id].label}: show who switched it on`
                        : undefined
                    }
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: SERIES[id].color }}
                      aria-hidden="true"
                    />
                    <span className="text-ink-soft">{SERIES[id].label}</span>
                    <span className="nums ml-auto font-medium text-ink">
                      {formatCount(v)}
                    </span>
                    <span className="nums w-12 shrink-0 text-right text-xs text-ink-muted">
                      {formatPct(share, 0)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {total === 0 ? (
              <p className="mt-4 text-xs text-ink-muted">
                No AI activity in this period.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );
}
