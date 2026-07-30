/** Raw row shape of public.lead_journey. */
export type JourneyRow = {
  source: string;
  created_date: string; // YYYY-MM-DD
  game_plan_booked_date: string | null;
};

/**
 * Cohort booking rate: of the leads CREATED within [from, to], how many
 * booked a Game Plan call within that SAME window — not "ever, on any date".
 *
 * This is the distinction `metrics_daily` cannot express: a lead created
 * today who books next week should count toward next week's rate, not
 * today's, and a lead created this week who books later in the same week
 * SHOULD count toward this week's rate even though it didn't book same-day.
 * `lead_journey` carries a `created_date` and a `game_plan_booked_date` per
 * opportunity, so the window check can be applied to both ends directly.
 */
export function cohortBookingRate(
  rows: JourneyRow[],
  from: string,
  to: string,
  source?: string | null,
): { leads: number; booked: number } {
  let leads = 0;
  let booked = 0;

  for (const r of rows) {
    if (r.created_date < from || r.created_date > to) continue;
    if (source && r.source !== source) continue;

    leads += 1;
    if (
      r.game_plan_booked_date &&
      r.game_plan_booked_date >= from &&
      r.game_plan_booked_date <= to
    ) {
      booked += 1;
    }
  }

  return { leads, booked };
}
