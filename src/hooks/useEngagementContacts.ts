"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUBACCOUNT, supabase } from "@/lib/supabase";
import { EngagementContactRow } from "@/lib/engagement";
import { addDays, todayInGymTz } from "@/lib/dates";

const POLL_MS = 60_000;
const PAGE_SIZE = 1000;

/** Matches useEngagement's window: these rows explain the same numbers. */
const LOOKBACK_DAYS = 100;

/**
 * The metrics whose cards the origin filter has to reach. `source` on all of
 * them is a channel or a message fingerprint, never a lead origin, so scoping
 * them means going through the contact.
 */
const CONTACT_KEYS = [
  "step_sent",
  "step_reply",
  "msg_sent_auto",
  "msg_sent_inbox",
  "msg_reply",
  "msg_failed",
  "optout_dnd",
  "ai_conversations",
  "ai_interactions",
];

export type EngagementContactsState = {
  rows: EngagementContactRow[];
  loading: boolean;
  /**
   * True once a fetch has come back without the `occurrences` column — the
   * migration that adds it has not been run yet. The cards fall back to the
   * unfiltered daily counts rather than rendering zeros.
   */
  unavailable: boolean;
};

/** Postgres error code for "column does not exist". */
const UNDEFINED_COLUMN = "42703";

export function useEngagementContacts(): EngagementContactsState {
  const [rows, setRows] = useState<EngagementContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const subaccountId = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      if (!subaccountId.current) {
        const { data, error } = await supabase
          .from("subaccounts")
          .select("id")
          .eq("name", SUBACCOUNT)
          .single();
        if (error) throw error;
        if (!data) throw new Error(`Subaccount "${SUBACCOUNT}" not found.`);
        subaccountId.current = data.id;
      }

      const since = addDays(todayInGymTz(), -LOOKBACK_DAYS);
      const all: EngagementContactRow[] = [];

      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from("metric_contacts")
          .select("metric_key, metric_date, source, ghl_contact_id, occurrences")
          .eq("subaccount_id", subaccountId.current)
          .in("metric_key", CONTACT_KEYS)
          .gte("metric_date", since)
          .order("metric_date", { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (error) {
          if (error.code === UNDEFINED_COLUMN) {
            setUnavailable(true);
            setRows([]);
            return;
          }
          throw error;
        }
        if (!data?.length) break;

        all.push(...(data as EngagementContactRow[]));
        if (data.length < PAGE_SIZE) break;
      }

      setRows(all);
      setUnavailable(false);
    } catch {
      // Deliberately quiet: this fetch only powers the origin filter on the
      // message cards. The page still has every number it had before, and
      // shouting about it would put an error banner over a working dashboard.
      setUnavailable(true);
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
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [load]);

  return { rows, loading, unavailable };
}
