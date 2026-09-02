/**
 * Message fingerprint to GoHighLevel snippet name.
 *
 * The collection workflows key `step_sent` / `step_reply` by a fingerprint of
 * the message body, because GoHighLevel puts no template id on a sent message
 * and no subject on a sent email — the body is the only identity available.
 *
 * A fingerprint is a stable id but a terrible label: nobody can find
 * "…thanks for reaching out…" in the snippet library. This maps each one to the
 * snippet it came from, so the table reads "Email: Welcome" instead.
 *
 * Built by replaying 305 conversations and matching each sent body against the
 * snippet library with 6-word shingles, then taking the majority vote per
 * fingerprint. Covers 79% of send volume; the rest is retired copy that no
 * longer exists as a snippet, and falls back to a readable extract.
 *
 * Regenerate with scripts/dashboard_v2/build_message_names.py in the ops repo
 * whenever snippet copy changes enough to shift a fingerprint.
 *
 * Six entries were added by hand after the 90-day rebuild: high-volume copy
 * that has since been edited in GoHighLevel, so the shingle match no longer
 * finds it in the library. They are marked "retired copy" where a current
 * snippet says the same thing. One of them, the Jessica opener, is the best
 * performing message in the account.
 *
 * One known ambiguity: `formula_fitness_your_consultation_formula_fitness`
 * matched "Email: Confirmed Consultation" 16 times and
 * "Email: Payment Reminder - 2h" 9 times. The two share most of their body;
 * the majority wins and the minority is folded in with it.
 */
export const MESSAGE_NAMES: Record<string, string> = {
  "following_still_looking_get_star": "SMS: Follow-up (still looking to get started)",
  "for_reaching_out_formula_fitness": "SMS: Welcome (retired copy)",
  "free_min_call_with_formula_fitne": "SMS: Confirmed Call (retired copy)",
  "jessica_from_formula_fitness_wha": "SMS: Jessica Opener (what do you want to work on)",
  "quick_reminder_our_initial_consu": "SMS: Consultation Value Reminder",
  "your_free_min_call_with_formula": "SMS: Call in 1h Reminder (retired copy)",
  "all_set_registered_you_the_formula": "SMS: Referral Program Confirmation",
  "ask_from_promise_one_quick_question": "SMS: NPS Final Request (Day 19)",
  "been_training_with_for_couple_weeks": "SMS: NPS Request (Day 14)",
  "formula_fitness_circling_back_case_last": "SMS: Nurture Day 0 (Permission Ask)",
  "formula_fitness_free_discovery_call_your": "Email: Confirmed Call",
  "formula_fitness_game_plan_call_your": "Email: Confirmed Call",
  "formula_fitness_great_news_your_consultation": "Email: Payment Received",
  "formula_fitness_had_you_down_for": "Email: No Show — Reschedule",
  "formula_fitness_just_checking_one_last": "Email: No Show — Final Attempt (Day 3 after no-show)",
  "formula_fitness_just_wanted_share_bit": "Email: Follow-up #1 — Consultation Details (Day 1)",
  "formula_fitness_most_people_guess_their": "Email: Follow-up #2 — Value Reminder (Day 5)",
  "formula_fitness_sent_quick_feedback_request": "Email: NPS Reminder (Day 16)",
  "formula_fitness_thanks_for_coming_for": "Email: Recovery Day 2 ",
  "formula_fitness_thanks_for_reaching_out": "Email: Welcome",
  "formula_fitness_thanks_for_taking_the": "Email: Recovery Day 2 ",
  "formula_fitness_there_great_news_your": "Email: Payment Received",
  "formula_fitness_there_thanks_for_reaching": "Email: Welcome",
  "formula_fitness_this_our_last_follow": "Email: Recovery Day 9 — Final",
  "formula_fitness_was_great_meeting_you": "SMS: Recovery Day 0",
  "formula_fitness_your_consultation_formula_fitness": "Email: Confirmed Consultation",
  "formula_fitness_your_consultation_request_formula": "Email: Consultation Booked",
  "formula_fitness_your_deposit_has_been": "Email: Payment Received",
  "great_meeting_you_formula_fitness_have": "SMS: Recovery Day 0",
  "great_news_your_consultation_formula_fitness": "SMS: Confirmed Consultation",
  "great_news_your_consultation_request_formula": "Email: Consultation Booked",
  "great_news_your_deposit_was_received": "SMS: Payment Confirmed – Consultation Locked",
  "heads_your_consultation_formula_fitness_still": "SMS: Payment Nudge – 20 min",
  "just_checking_your_plan_still_here": "SMS: Recovery Day 5",
  "just_checking_your_training_plan_still": "SMS: Recovery Day 5",
  "just_want_make_sure_last_message": "SMS: Follow-up #1 (1h after, no reply)",
  "just_wanted_share_bit_more_about": "Email: Follow-up #1 — Consultation Details (Day 1)",
  "most_people_guess_their_way_through": "Email: Follow-up #2 — Value Reminder (Day 5)",
  "reminder_your_consultation_formula_fitness_tomorrow": "SMS: 24h Reminder",
  "see_you_hours_formula_fitness_ball": "SMS: 2h Reminder",
  "thanks_for_reaching_out_formula_fitness": "Email: Welcome",
  "thanks_for_the_feedback_appreciate_your": "SMS: Thank You — Passive (Score 7-8)",
  "thanks_for_the_feedback_means_lot": "SMS: Thank You — Promoter (Score 9-10)",
  "this_with_formula_fitness_saw_you": "SMS: Welcome (Speed-to-Lead)",
  "unfortunately_your_consultation_formula_fitness_scheduled": "SMS: Consultation Cancelled",
  "want_come_takes_seconds_rebook_just": "SMS: No Show — Day 1 Follow-up",
  "you_haven_had_chance_respond_yet": "SMS: Follow-up #2 (Day 3)",
  "your_consultation_formula_fitness_friday_june": "SMS: Final Payment Reminder – 2 days",
  "your_consultation_formula_fitness_monday_june": "SMS: Final Payment Reminder – 2 days",
  "your_consultation_formula_fitness_officially_confirmed": "Email: Payment Received",
  "your_consultation_formula_fitness_tuesday_august": "SMS: Final Payment Reminder – 2 days",
  "your_consultation_formula_fitness_tuesday_june": "SMS: Final Payment Reminder – 2 days",
  "your_consultation_friday_june_not_confirmed": "SMS: Payment Reminder – 2h",
  "your_consultation_monday_july_not_confirmed": "SMS: Payment Reminder – 2h",
  "your_consultation_monday_june_not_confirmed": "SMS: Payment Reminder – 2h",
  "your_consultation_request_formula_fitness_confirm": "SMS: Consultation Booked",
  "your_consultation_tuesday_august_not_confirmed": "SMS: Payment Reminder – 2h",
  "your_consultation_tuesday_june_not_confirmed": "SMS: Payment Reminder – 2h",
  "your_consultation_wednesday_july_not_confirmed": "SMS: Payment Reminder – 2h",
  "your_free_min_game_plan_call": "SMS: Confirmed Call",
  "your_free_minute_game_plan_call": "SMS: Call in 1h Reminder",
  "your_quick_start_guide_apps_download": "Email: Member Welcome Email",
  // Not a snippet: the automation sends the lead's own first name and a
  // question mark, so the body carries no words to fingerprint. The
  // collection workflows detect that shape and key it here.
  name_only_nudge: "SMS: Name Only Nudge (“John?”)",
};
