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

| `source` slug | Label shown | Writing yet? |
|---|---|---|
| `form` | Website Form | yes |
| `call` | AI Voice Call | — |
| `sms` | SMS Inbound | yes |
| `qr_code` | QR Code | — |
| `referral` | Referral | — |
| `tony_tran_old_lead` | Tony Tran Old Lead | not yet |
| `tony_tran_website` | Tony Tran Website | not yet |
| `email_inbound` | Email Inbound | not yet |

Slugs are intentionally **not** renamed to match their labels: `form`, `call` and
`sms` already carry production rows, and renaming them would orphan that data
until the n8n workflow changed in lockstep. The label is what anyone reads; the
slug is only the join key.

The last three are new — they render zero until the workflow starts emitting
them. Nothing breaks in the meantime, and `mergeSources()` means a slug that
isn't on this list still appears (title-cased) rather than vanishing from a
total.

`source` vocabularies overlap across metrics — `call` is "AI Voice Call" as a
lead origin but "Voice" as a conversation channel — so `humanizeSource()` takes
a `metricKey` and never resolves labels globally.

### Two names that don't mean what they say

**`form_submissions_total` is not form submissions.** It counts *every
opportunity created* that day, categorised by lead origin — form submissions are
one category (`source = 'form'`). The UI therefore calls the total **Leads
Created** and exposes the categories as a filter, so nobody reads the total as a
form count.

**`ai_conversations` counts messages, not conversations,** and is not filtered by
AI authorship — the GHL API has no reliable per-message AI marker for SMS or
email. It counts every message exchanged in active conversations on the three
channels. The AI replies to all of them, which is why the card keeps the "AI
Conversations" name; the caption states the unit.

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

## Chart colors

The palette is derived from the official Formula Fitness site and **validated**,
not hand-picked — OKLab CVD separation, lightness band, chroma floor and contrast
against the white card surface. Two deliberate choices:

- **Stage volume** uses a single-hue ordinal ramp: stage order carries meaning.
- **Lead origins** are ranked bars in one hue, not eight colours. The categories
  are nominal, so colouring them separately would re-encode what bar length
  already shows, and eight classes is past where adjacent hues stay distinct.

Values and rationale live in `src/lib/brand.ts`; re-run the validator before
changing any of them.

## Caveats surfaced in the UI

Stage-to-stage percentages are deliberately absent. The four stages are not a
strict sequence — `consultation_booked` counts only the $100 modality and an
opportunity can reach Closed Won without it — and the metrics count stage entries
per day rather than following a cohort, so any conversion rate across them is
approximate. The one genuinely sequential step, leads created → Game Plan calls,
is shown as **Booking rate** with that caveat printed on the card.

## Deploying

Connected to Vercel; every push to `main` deploys. The page is fully static with
client-side data fetching, so no server runtime is required.

The dashboard is **public** — anyone with the URL sees the numbers. Adding a
password gate later means a `proxy.ts` (Next.js 16 renamed `middleware`), which
doesn't affect anything in this repo.
