/**
 * Row shape read from public.metric_contacts for the booking cohort.
 *
 * The cohort used to come from public.lead_journey, written by its own hourly
 * workflow. That workflow failed on every run for a week and left the table
 * holding 287 rows for 228 opportunities, four days stale — so the rate on
 * screen was computed from numbers that matched nothing. The same question is
 * answerable from `metric_contacts`, which carries one row per contact per
 * metric per day and is rebuilt from GoHighLevel directly, so the cohort now
 * reads from there and lead_journey is out of the picture.
 */
export type BookingCohortRow = {
  metric_key: string;
  source: string;
  metric_date: string; // YYYY-MM-DD
  ghl_contact_id: string;
};

/** The two metrics the cohort is built from. */
export const COHORT_KEYS = [
  "form_submissions_total",
  "game_plan_call_booked",
] as const;

/**
 * Cohort booking rate: of the leads CREATED within [from, to], how many
 * booked a Game Plan call within that SAME window — not "ever, on any date".
 *
 * This is the distinction a daily count cannot express: a lead created today
 * who books next week should count toward next week's rate, not today's, and a
 * lead created this week who books later in the same week SHOULD count toward
 * this week's rate even though it did not book same-day.
 *
 * `leads` counts lead rows, one per opportunity, so the denominator matches the
 * "Leads Created" card exactly. `booked` counts contacts, so a contact with two
 * opportunities and one booking can never push the rate above 100%.
 *
 * `bookedIds` is that same numerator as a list, so the card's drill-down can
 * show the people it actually counted rather than re-deriving a set that would
 * not quite agree with the number on screen.
 */
export function cohortBookingRate(
  rows: BookingCohortRow[],
  from: string,
  to: string,
  source?: string | null,
): { leads: number; booked: number; bookedIds: string[] } {
  const inWindow = (r: BookingCohortRow) =>
    r.metric_date >= from &&
    r.metric_date <= to &&
    (!source || r.source === source);

  const leadRows = rows.filter(
    (r) => r.metric_key === "form_submissions_total" && inWindow(r),
  );

  const bookedContacts = new Set(
    rows
      .filter((r) => r.metric_key === "game_plan_call_booked" && inWindow(r))
      .map((r) => r.ghl_contact_id),
  );

  const booked = new Set(
    leadRows
      .filter((r) => bookedContacts.has(r.ghl_contact_id))
      .map((r) => r.ghl_contact_id),
  );

  return {
    leads: leadRows.length,
    booked: booked.size,
    bookedIds: [...booked],
  };
}
