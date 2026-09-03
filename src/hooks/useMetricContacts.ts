"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SUBACCOUNT, supabase } from "@/lib/supabase";

/** Raw row shape of public.metric_contacts. */
export type ContactRow = {
  ghl_contact_id: string;
  contact_name: string | null;
  detail: string | null;
  metric_date: string;
  source: string;
  occurred_at: string | null;
};

export type ContactsState = {
  rows: ContactRow[];
  loading: boolean;
  error: string | null;
  /**
   * True when the backing table has not been created yet. The drill-down is
   * additive, so the dashboard stays usable without it rather than throwing.
   */
  unavailable: boolean;
};

/** Enough to answer "who was that", not a data export. */
const MAX_ROWS = 300;

/** Postgres error code for "relation does not exist". */
const UNDEFINED_TABLE = "42P01";

const EMPTY: ContactsState = {
  rows: [],
  loading: false,
  error: null,
  unavailable: false,
};

type Result = {
  /** The query this result answers. */
  token: string;
  rows: ContactRow[];
  error: string | null;
  unavailable: boolean;
};

/**
 * Contacts behind one metric, fetched only when a drill-down actually opens —
 * this data is an order of magnitude larger than the counts and nobody needs it
 * until they click.
 *
 * Takes primitives rather than a query object: an object would get a new
 * identity on every render of the parent and refetch forever.
 *
 * `loading` is derived from "the stored result does not answer the current
 * query" rather than being written at the top of the effect. That keeps the
 * effect free of synchronous state updates, and makes an out-of-order response
 * impossible to render — a slow reply for a metric the user already navigated
 * away from carries the wrong token and is ignored.
 */
export function useMetricContacts(
  metricKey: string | null,
  from: string,
  to: string,
  source?: string | string[] | null,
  contactIds?: string[] | null,
): ContactsState {
  const [result, setResult] = useState<Result | null>(null);
  const subaccountId = useRef<string | null>(null);

  // A message can sit behind several fingerprints, so the source is a list as
  // often as it is a single value. Joining it keeps the token a primitive.
  const sourceKey = Array.isArray(source) ? source.join(",") : (source ?? "");
  // A card that computed its own set of people passes the ids; without it the
  // query is "everyone this metric touched in the window".
  const idsKey = contactIds ? contactIds.join(",") : "";

  const token = metricKey
    ? `${metricKey}|${from}|${to}|${sourceKey}|${idsKey}`
    : null;

  const load = useCallback(
    async (
      requestToken: string,
      key: string,
      start: string,
      end: string,
      src: string | string[] | null | undefined,
      ids: string[] | null | undefined,
    ) => {
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

        let request = supabase
          .from("metric_contacts")
          .select(
            "ghl_contact_id, contact_name, detail, metric_date, source, occurred_at",
          )
          .eq("subaccount_id", subaccountId.current)
          .eq("metric_key", key)
          .gte("metric_date", start)
          .lte("metric_date", end)
          .order("metric_date", { ascending: false })
          .limit(MAX_ROWS);

        if (Array.isArray(src)) {
          if (src.length > 0) request = request.in("source", src);
        } else if (src) {
          request = request.eq("source", src);
        }

        if (ids) request = request.in("ghl_contact_id", ids);

        const { data, error: rowErr } = await request;

        if (rowErr) {
          if (rowErr.code === UNDEFINED_TABLE) {
            setResult({
              token: requestToken,
              rows: [],
              error: null,
              unavailable: true,
            });
            return;
          }
          throw rowErr;
        }

        setResult({
          token: requestToken,
          rows: (data ?? []) as ContactRow[],
          error: null,
          unavailable: false,
        });
      } catch (e) {
        setResult({
          token: requestToken,
          rows: [],
          error: e instanceof Error ? e.message : "Failed to load contacts.",
          unavailable: false,
        });
      }
    },
    [],
  );

  useEffect(() => {
    if (!token || !metricKey) return;
    // Same shape as useMetrics/useBookingCohort: the fetch is kicked off through
    // a local starter so the effect body itself stays free of state writes.
    let alive = true;
    const start = () => {
      if (alive) void load(token, metricKey, from, to, source, contactIds);
    };
    start();
    return () => {
      alive = false;
    };
  }, [load, token, metricKey, from, to, source, contactIds]);

  if (!token) return EMPTY;

  const answered = result?.token === token;
  return {
    rows: answered ? result.rows : [],
    loading: !answered,
    error: answered ? result.error : null,
    unavailable: answered ? result.unavailable : false,
  };
}
