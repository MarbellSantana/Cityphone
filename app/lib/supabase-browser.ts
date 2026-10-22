import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yftaloxtylijudnoewrm.supabase.co";
let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const ALLOWED_CITYPHONE_EMAIL =
  (process.env.NEXT_PUBLIC_CITYPHONE_ALLOWED_EMAIL || "").trim().toLowerCase();
