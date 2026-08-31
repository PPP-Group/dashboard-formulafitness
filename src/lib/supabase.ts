import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://placeholder-url.supabase.co";
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-anon-key";

/**
 * Read-only client. The anon key can only SELECT — writes are reserved for
 * the service_role key used by the n8n workflows.
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export const SUBACCOUNT = process.env.NEXT_PUBLIC_SUBACCOUNT ?? "formula-fitness";
