"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUBACCOUNT, supabase } from "@/lib/supabase";
import { BookingCohortRow, COHORT_KEYS } from "@/lib/journey";
import { addDays, todayInGymTz } from "@/lib/dates";

/** The n8n sync runs hourly; a 60s poll is plenty to feel live. */
const POLL_MS = 60_000;
const PAGE_SIZE = 1000;

/** Upper bound on history pulled — matches useMetrics' lookback window. */
const LOOKBACK_DAYS = 400;

export type BookingCohortState = {
  rows: BookingCohortRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

/**
 * Reads the contact rows behind the two metrics the booking cohort needs.
 *
 * A separate small fetch loop rather than folding into useMetrics: this is
 * contact-level data, an order of magnitude denser than the daily counts, and
 * only two metric keys of it are wanted.
 */
export function useBookingCohort(): BookingCohortState {
  const [rows, setRows] = useState<BookingCohortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subaccountId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (!subaccountId.current) {
        const { data, error: subErr } = await supabase
          .from("subaccounts")
          .select("id")
          .eq("name", SUBACCOUNT)
          .single();

        if (subErr) throw subErr;
        if (!data) throw new Error(`Subaccount "${SUBACCOUNT}" not found.`);
        subaccountId.current = data.id;
      }

      const since = addDays(todayInGymTz(), -LOOKBACK_DAYS);
      const all: BookingCohortRow[] = [];

      for (let page = 0; ; page++) {
        const { data, error: rowErr } = await supabase
          .from("metric_contacts")
          .select("metric_key, source, metric_date, ghl_contact_id")
          .eq("subaccount_id", subaccountId.current)
          .in("metric_key", COHORT_KEYS as unknown as string[])
          .gte("metric_date", since)
          .order("metric_date", { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (rowErr) throw rowErr;
        if (!data?.length) break;

        all.push(...(data as BookingCohortRow[]));
        if (data.length < PAGE_SIZE) break;
      }

      setRows(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load the booking cohort.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive) void load();
    };

    tick();
    const id = setInterval(tick, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const refresh = useCallback(() => {
    setLoading(true);
    void load();
  }, [load]);

  return { rows, loading, error, refresh };
}
