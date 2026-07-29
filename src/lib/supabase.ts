import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
  );
}

/**
 * Read-only client. The anon key can only SELECT — writes are reserved for
 * the service_role key used by the n8n workflows.
 */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});

export const SUBACCOUNT = process.env.NEXT_PUBLIC_SUBACCOUNT ?? "formula-fitness";
