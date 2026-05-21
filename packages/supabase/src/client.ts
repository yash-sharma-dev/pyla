import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * A minimal key-value storage adapter compatible with Supabase's auth storage interface.
 * Implement this to plug in chrome.storage.local, AsyncStorage, etc.
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

export interface ClientOptions {
  storage?: StorageAdapter;
  apiKey?: string;
}

/**
 * Creates a typed Supabase client.
 *
 * @param url - Your Supabase project URL (VITE_SUPABASE_URL)
 * @param anonKey - Your Supabase anon/public key (VITE_SUPABASE_ANON_KEY)
 * @param options - Configuration options for storage and API keys
 * @returns A typed SupabaseClient instance
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: ClientOptions,
): SupabaseClient<Database> {
  const globalOptions = options?.apiKey
    ? { headers: { "x-pyla-api-key": options.apiKey } }
    : undefined;

  return createClient<Database>(url, anonKey, {
    auth: {
      storage: options?.storage as any,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: globalOptions,
  });
}

export type { SupabaseClient };
