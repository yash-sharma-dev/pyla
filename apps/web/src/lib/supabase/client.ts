"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@pyla/supabase";

/**
 * Creates a Supabase client for use in Client Components.
 * Persists session in cookies (compatible with the SSR client above).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
