"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUBACCOUNT, supabase } from "@/lib/supabase";
import { MetricRow } from "@/lib/metrics";
import { ENGAGEMENT_KEYS } from "@/lib/engagement";
import { addDays, todayInGymTz } from "@/lib/dates";

const POLL_MS = 60_000;
const PAGE_SIZE = 1000;

/**
 * Engagement rows are far denser than the pipeline metrics — one row per
 * message per day, not one per stage — so they are fetched on their own
 * shorter window instead of riding along with `useMetrics`' 400-day pull.
 * 90 days matches the retention the rest of the dashboard assumes.
 */
const LOOKBACK_DAYS = 100;

export type EngagementState = {
  rows: MetricRow[];
  loading: boolean;
  /**
   * Null while the feature is simply not producing data yet. The engagement
   * workflow ships after the dashboard, so an empty table is the expected
   * first state, not a failure worth shouting about.
   */
  error: string | null;
  refresh: () => void;
};

export function useEngagement(): EngagementState {
  const [rows, setRows] = useState<MetricRow[]>([]);
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
      const all: MetricRow[] = [];

      for (let page = 0; ; page++) {
        const { data, error: rowErr } = await supabase
          .from("metrics_daily")
          .select("metric_key, metric_date, count, source")
          .eq("subaccount_id", subaccountId.current)
          .in("metric_key", ENGAGEMENT_KEYS as unknown as string[])
          .gte("metric_date", since)
          .order("metric_date", { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (rowErr) throw rowErr;
        if (!data?.length) break;

        all.push(...(data as MetricRow[]));
        if (data.length < PAGE_SIZE) break;
      }

      setRows(all);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load engagement.");
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
