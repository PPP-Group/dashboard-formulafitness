"use client";

import { brand, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";
import { InfoTip, TipRow } from "./ui/InfoTip";

/**
 * A single ratio against a limit — a meter, not a gauge chart and not a
 * two-slice pie. The track is the same ramp as the fill.
 *
 * This is a genuine cohort rate, computed from the contact rows behind the
 * lead and booking metrics: of the leads CREATED in the selected period, how
 * many booked a Game Plan call within that SAME period — not "ever, on any
 * date". A lead created today that books next week does not count toward
 * today's rate; it counts toward next week's, the day it's inside that window.
 * This is why the rate can never exceed 100% (unlike a version comparing two
 * independently-counted totals, which could).
 *
 * The booking date comes from the calendar, which records when the appointment
 * was made and never changes it. An earlier version read a stage date that was
 * only observed while the opportunity sat in that stage, so anyone who moved
 * on stopped counting and the history quietly drained away.
 */
export function BookingRateMeter({
  booked,
  leads,
  loading,
  refetching,
  subtitle,
  onSelect,
}: {
  booked: number;
  leads: number;
  loading: boolean;
  refetching: boolean;
  subtitle: string;
  /** Present = the card opens the leads that make up the denominator. */
  onSelect?: () => void;
}) {
  const interactive = Boolean(onSelect) && !loading && leads > 0;
  const rate = leads > 0 ? (booked / leads) * 100 : null;
  const clamped = Math.min(rate ?? 0, 100);

  const r = 54;
  const circumference = Math.PI * r; // half circle
  const dash = (clamped / 100) * circumference;

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        interactive &&
          "cursor-pointer transition-colors hover:border-brand-light hover:bg-brand-soft/40",
      )}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? "Booking rate: show the leads counted" : undefined}
    >
      <CardHeader
        title="Booking rate"
        subtitle={subtitle}
        info={
          <InfoTip title="Booking rate" align="right">
              <TipRow label="What it is">
                Of the leads created in the selected period, the share who booked a game plan call inside that same period.
              </TipRow>
              <TipRow label="How it is worked out">
                A cohort rate, not two totals divided. A lead created today who books next week counts toward next week, not today. The booking date comes from the calendar, which never changes it.
              </TipRow>
              <TipRow label="Filters">
                Both ends move with the period picker, so a wider period gives leads more room to book and usually reads higher. The origin filter narrows the cohort to one lead source.
              </TipRow>
          </InfoTip>
        }
      />

      <div
        className={cn(
          "flex flex-1 flex-col items-center px-5 pt-2 pb-5",
          refetching && "refetching",
        )}
      >
        {loading ? (
          <Skeleton className="h-28 w-full" />
        ) : (
          <>
            <svg
              viewBox="0 0 140 76"
              className="w-full max-w-[190px]"
              role="img"
              aria-label={
                rate === null
                  ? "Booking rate unavailable — no leads created"
                  : `Booking rate ${formatPct(rate)}`
              }
            >
              <path
                d="M 16 70 A 54 54 0 0 1 124 70"
                fill="none"
                stroke={viz.track}
                strokeWidth={12}
                strokeLinecap="round"
              />
              {rate !== null ? (
                <path
                  d="M 16 70 A 54 54 0 0 1 124 70"
                  fill="none"
                  stroke={brand.primary}
                  strokeWidth={12}
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                />
              ) : null}
            </svg>

            <p className="-mt-6 text-[28px] leading-none font-semibold text-ink">
              {rate === null ? "—" : formatPct(rate, 0)}
            </p>

            <p className="mt-3 text-center text-xs text-ink-muted">
              {rate === null ? (
                "No leads created in this period"
              ) : (
                <>
                  <span className="nums font-medium text-ink-soft">
                    {formatCount(booked)}
                  </span>{" "}
                  of{" "}
                  <span className="nums font-medium text-ink-soft">
                    {formatCount(leads)}
                  </span>{" "}
                  {leads === 1 ? "lead" : "leads"} booked a Game Plan call in
                  this same period
                </>
              )}
            </p>

            <p className="mt-2 text-center text-[11px] text-ink-faint">
              Cohort rate — counts a booking only if it happened within the
              period the lead was created
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
