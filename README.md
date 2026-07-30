# Formula Fitness — Metrics Dashboard

Live dashboard for the Formula Fitness (Los Alamitos, CA) GoHighLevel metrics.

```
GoHighLevel  →  n8n (hourly)  →  Supabase  →  this dashboard (read-only)
```

This repo is only the last box. Collection, the GHL integration and the Supabase
schema are owned separately.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL + anon key
npm run dev
```

## Environment

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **anon** key only — RLS allows SELECT and nothing else |
| `NEXT_PUBLIC_SUBACCOUNT` | matches `subaccounts.name`, e.g. `formula-fitness` |

> Never put the `service_role` key here. It belongs to n8n, and anything in a
> `NEXT_PUBLIC_*` variable ships to the browser.

## Data model

Everything is read from `public.metrics_daily`:

| Column | Notes |
|---|---|
| `subaccount_id` | FK to `subaccounts` — resolved once by `name`, not hardcoded |
| `metric_key` | see below |
| `metric_date` | plain `date`, already in `America/Los_Angeles` |
| `count` | integer |
| `source` | **generic breakdown dimension**, reused per metric; part of the unique constraint |

`source` is not always "where the lead came from" — it means whatever the metric
needs it to mean. Metrics without a breakdown store an **empty string**, never
`null`.

| `metric_key` | Breakdown | `source` values |
|---|---|---|
| `form_submissions_total` | yes | the eight lead origins below |
| `game_plan_call_booked` | no | `''` |
| `consultation_booked` | no | `''` |
| `consultation_won` | no | `''` |
| `ai_conversations` | yes | `call`, `sms`, `email` |

### The eight lead origins

Slugs are derived from the literal `source` string GoHighLevel puts on an
opportunity, verified against the live API on 2026-07-30:

| GHL `source` | slug | Label shown |
|---|---|---|
| `Website Form` | `website_form` | Website Form |
| `AI Voice Call` | `ai_voice_call` | AI Voice Call |
| `SMS Inbound` | `sms_inbound` | SMS Inbound |
| `QR Code` | `qr_code` | QR Code |
| `Referral` | `referral` | Referral |
| `Tony Tran Old Lead` | `old_lead` | Old Lead |
| `Tony Tran Website` | `tony_tran_website` | Tony Tran Website |
| `Email Inbound` | `email_inbound` | Email Inbound |

"Tony Tran Old Lead" is shortened to **Old Lead** — the prefix carried no
meaning. "Tony Tran Website" keeps its prefix: shortened to "Website" it would
read as a duplicate of "Website Form" while being a different origin entirely.

The n8n workflow maps these by exact string match. Anything it doesn't
recognise is slugified rather than bucketed as "other", so a new GHL origin
stays distinguishable; `mergeSources()` then renders it title-cased instead of
dropping it from the total.

`source` vocabularies overlap across metrics — `call` is "AI Voice Call" as a
lead origin but "Voice" as a conversation channel — so `humanizeSource()` takes
a `metricKey` and never resolves labels globally.

### Two names that don't mean what they say

**`form_submissions_total` is not form submissions.** It counts *every
opportunity created* that day, categorised by lead origin — form submissions are
one category (`source = 'form'`). The UI therefore calls the total **Leads
Created** and exposes the categories as a filter, so nobody reads the total as a
form count.

**`ai_conversations` is not filtered by AI authorship** — the GHL API has no
reliable per-message AI marker for SMS or email, so it counts every message
exchanged in active conversations. It also isn't counted the same way on every
channel: SMS and email count **activations** (once per conversation per day,
however many messages that thread had — the AI activates once and then keeps
replying to whatever comes next), while **voice stays a raw message count**, per
the client's explicit request. See `Count Messages By Channel` in the
`GHL - AI Conversations` n8n workflow.

Category lists are treated as open, not closed: `mergeSources()` renders any
`source` value the workflows write, even one not listed above, so a new GHL
origin never silently disappears from a total.

### Why the weekly/monthly views aren't used

`metrics_weekly` / `metrics_monthly` exist and are correct. The dashboard instead
pulls daily rows once and rolls them up client-side, which gives the same numbers
(both are a `SUM` over a truncated date) while making the Daily/Weekly/Monthly
toggle instant and keeping the request count at one. Week buckets start Monday to
match `date_trunc('week')`.

### Timezone

`metric_date` is never parsed with `new Date("2026-07-29")` — that reads as UTC
midnight and shifts the day backwards for any viewer west of UTC. See
`src/lib/dates.ts`.

### Retention

The 90-day cleanup workflow does not exist yet. The client caps its own fetch at
400 days and pages through results, so nothing breaks while data accumulates.

## `lead_journey` — the cohort table

`metrics_daily` is a daily aggregate: it can say "3 leads were created today"
and, separately, "1 Game Plan call was booked today," but it cannot say whether
that 1 booking came from one of those 3 leads or from a lead created last week.
Cohort questions — "of the leads created in period X, how many of *those*
booked, no matter which day within X they booked on" — need a second row of
history per opportunity, not a count.

`public.lead_journey` (also Supabase, same RLS shape: public `SELECT`, writes
only via `service_role`) has one row per GHL opportunity:

| Column | Notes |
|---|---|
| `ghl_opportunity_id` | the GHL opportunity's own id |
| `source` | lead origin, same slugs as `metrics_daily` |
| `created_date` | the opportunity's `createdAt`, in LA time |
| `game_plan_booked_date` | date it first entered the Game Plan stage, or `null` |
| `consultation_booked_date` | same, for the $100 Consultation stage |
| `closed_won_date` | same, for Closed Won |

**The important limitation:** the GHL opportunities API exposes only an
opportunity's *current* stage and when it entered that stage — never a full
stage-history log. So a stage date can only be captured while the hourly sync
(`GHL - Lead Journey Sync`) happens to observe an opportunity sitting in that
exact stage. Once captured, a date is never cleared or overwritten (the sync's
`Merge Journey Dates` step always prefers the already-stored value), so a lead
that moves through stages faster than the hourly poll can still end up with an
earlier date left `null` even though it did pass through that stage. This is a
best-effort forward-looking capture, not a full historical reconstruction —
acceptable here because the retention window is short and stage changes are
infrequent, but worth knowing if the numbers seem short by a few units.

The dashboard's **Booking rate** card is the only consumer today
(`src/lib/journey.ts`, `src/hooks/useLeadJourney.ts`): for the selected period
`[from, to]`, `leads` = opportunities with `created_date` in that window, and
`booked` = the subset of those with `game_plan_booked_date` *also* in that same
window. A lead created today that books next week does not count toward
today's rate; it counts toward next week's. Because `lead_journey` carries
`source` per row, this is also the one card the lead-origin filter can scope
correctly end to end.

## Chart colors

The palette is derived from the official Formula Fitness site and **validated**,
not hand-picked — OKLab CVD separation, lightness band, chroma floor and contrast
against the white card surface. One deliberate choice: **lead origins** are
ranked bars in one hue, not eight colours. The categories are nominal, so
colouring them separately would re-encode what bar length already shows, and
eight classes is past where adjacent hues stay distinct.

Values and rationale live in `src/lib/brand.ts`; re-run the validator before
changing any of them.

## Caveats surfaced in the UI

**Booking rate** is a genuine cohort rate (see `lead_journey` above): it can
never exceed 100%, because the denominator and numerator are drawn from the
same set of leads over the same window, not two independently-aggregated
totals. Its caption says so.

There is no "Consultations → Closed Won" conversion percentage anywhere on the
dashboard, deliberately: `consultation_booked` counts only the $100 modality,
and an opportunity can reach Closed Won without ever passing through it, so a
stage-to-stage percentage there would be fiction.

## n8n gotcha: built-in pagination breaks httpHeaderAuth on this instance

The `GHL - Lead Journey Sync` workflow needs every opportunity in the pipeline,
not just today's, so it has to page through GHL's `/opportunities/search`
beyond the 100-per-request limit. The HTTP Request node's built-in
`options.pagination` (used successfully in the five other GHL workflows here)
made every request to this node come back `403 The token does not have access
to this location` — reproduced with the exact same credential and query
params that succeed with pagination off, and with a second credential too, so
it isn't a token or scope problem. Enabling pagination forces
`resolveWithFullResponse: true` internally, and something about that codepath
breaks the `genericCredentialType` / `httpHeaderAuth` credential injection on
this n8n instance.

The workaround (already in place, no action needed): the sync workflow
implements pagination manually — `Fetch One Page` (no `options.pagination`,
constant URL, `sendQuery: true` always, `specifyQuery: "json"` with the query
object built by an upstream Code node) into `Track Pages` (accumulates pages
in `$getWorkflowStaticData('global')`, decides whether to continue) into an
`IF` node that loops back to `Fetch One Page` on more-pages and forward to
`Build Journey Rows` when done. If a future workflow needs >100 records from
an `httpHeaderAuth`-authenticated endpoint, copy this pattern rather than
reaching for the built-in pagination option.

## Deploying

Connected to Vercel; every push to `main` deploys. The page is fully static with
client-side data fetching, so no server runtime is required.

The dashboard is **public** — anyone with the URL sees the numbers. Adding a
password gate later means a `proxy.ts` (Next.js 16 renamed `middleware`), which
doesn't affect anything in this repo.
