"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUBACCOUNT, supabase } from "@/lib/supabase";
import { MetricRow } from "@/lib/metrics";
import { addDays, todayInGymTz } from "@/lib/dates";

/** n8n writes hourly; a 60s poll is plenty to feel live. */
const POLL_MS = 60_000;
const PAGE_SIZE = 1000;

/**
 * Upper bound on history we pull. Retention is meant to be 90 days, but the
 * cleanup workflow isn't built yet — this keeps the payload bounded either way.
 */
const LOOKBACK_DAYS = 400;

export type MetricsState = {
  rows: MetricRow[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
};

export function useMetrics(): MetricsState {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cached so the polling refetch skips the subaccount lookup.
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
      const all: MetricRow[] = [];

      // Supabase caps a single response at 1000 rows, so page until exhausted.
      for (let page = 0; ; page++) {
        const { data, error: rowErr } = await supabase
          .from("metrics_daily")
          .select("metric_key, metric_date, count, source")
          .eq("subaccount_id", subaccountId.current)
          .gte("metric_date", since)
          .order("metric_date", { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (rowErr) throw rowErr;
        if (!data?.length) break;

        all.push(...(data as MetricRow[]));
        if (data.length < PAGE_SIZE) break;
      }

      setRows(all);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics.");
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

    // Catch up immediately when the tab comes back into focus.
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

  return { rows, loading, error, lastUpdated, refresh };
}
