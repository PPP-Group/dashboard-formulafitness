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
| `subaccount_id` | FK to `subaccounts` — resolved once by `name` |
| `metric_key` | see below |
| `metric_date` | plain `date`, already in `America/Los_Angeles` |
| `count` | integer |
| `source` | channel discriminator; part of the unique constraint |

Metric keys in production:

| `metric_key` | `source` values |
|---|---|
| `form_submissions_total` | `form` |
| `game_plan_call_booked` | `''` |
| `consultation_booked` | `''` |
| `consultation_won` | `''` |
| `ai_conversations` | `sms`, `call`, `email` |

Note `ai_conversations` is **one** key split by `source`, not the separate
`ai_voice_conversation_started` / `ai_sms_conversation_started` keys described in
the original handoff document. The `email` channel is not in that document
either, and currently carries real volume.

### Why the views aren't used

`metrics_weekly` / `metrics_monthly` exist and are correct. The dashboard instead
pulls daily rows once and rolls them up client-side, which gives the same numbers
(both are a `SUM` over a truncated date) while making the Daily/Weekly/Monthly
toggle instant and keeping the request count at one. Week buckets start Monday to
match `date_trunc('week')`.

### Timezone

`metric_date` is never parsed with `new Date("2026-07-29")` — that reads as UTC
midnight and shifts the day backwards for any viewer west of UTC. See
`src/lib/dates.ts`.

## Chart colors

The palette is derived from the official Formula Fitness site and **validated**,
not hand-picked — OKLab CVD separation, lightness band, chroma floor and contrast
against the white card surface. The funnel uses a single-hue ordinal ramp because
stage order carries meaning. Values and rationale live in `src/lib/brand.ts`;
re-run the validator before changing any of them.

## Deploying

Push to a Git remote, import the repo on Vercel, and set the three environment
variables above. The page is fully static with client-side data fetching, so no
server runtime is required.

The dashboard is **public** — anyone with the URL sees the numbers. Adding a
password gate later means a `proxy.ts` (Next.js 16 renamed `middleware`), which
doesn't affect anything in this repo.
