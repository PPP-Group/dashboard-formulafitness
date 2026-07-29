"use client";

import { brand, viz } from "@/lib/brand";
import { cn, formatCount, formatPct } from "@/lib/cn";
import { Card, CardHeader } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

/**
 * A single ratio against a limit — a meter, not a gauge chart and not a
 * two-slice pie. The track is the same ramp as the fill.
 *
 * Form submissions -> Game Plan calls is the one genuinely sequential step we
 * have. Deliberately NOT won/consultations-booked: `consultation_booked` counts
 * only the $100 modality while `consultation_won` counts every path, so that
 * ratio would compare two different populations.
 *
 * These are period volumes, not a tracked cohort: someone who submits a form
 * today and books next week lands in two different buckets, so the rate can
 * exceed 100%. The arc clamps; the number does not.
 */
export function BookingRateMeter({
  calls,
  submissions,
  loading,
  refetching,
  subtitle,
}: {
  calls: number;
  submissions: number;
  loading: boolean;
  refetching: boolean;
  subtitle: string;
}) {
  const rate = submissions > 0 ? (calls / submissions) * 100 : null;
  const clamped = Math.min(rate ?? 0, 100);

  const r = 54;
  const circumference = Math.PI * r; // half circle
  const dash = (clamped / 100) * circumference;

  return (
    <Card className="flex flex-col">
      <CardHeader title="Booking rate" subtitle={subtitle} />

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
                  ? "Booking rate unavailable — no form submissions"
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
                "No form submissions in this period"
              ) : (
                <>
                  <span className="nums font-medium text-ink-soft">
                    {formatCount(calls)}
                  </span>{" "}
                  Game Plan {calls === 1 ? "call" : "calls"} booked from{" "}
                  <span className="nums font-medium text-ink-soft">
                    {formatCount(submissions)}
                  </span>{" "}
                  form {submissions === 1 ? "submission" : "submissions"}
                </>
              )}
            </p>

            <p className="mt-2 text-center text-[11px] text-ink-faint">
              Period volumes, not a tracked cohort
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
