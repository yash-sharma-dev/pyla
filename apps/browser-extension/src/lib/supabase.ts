/**
 * Browser extension Supabase singleton.
 * Imports directly from @supabase/supabase-js (not @pyla/supabase)
 * to avoid WXT's module resolver misidentifying our StorageAdapter
 * interface as a wxt/utils/storage import.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Injected at build time by wxt.config.ts via Vite define — avoids conflicts
// with WXT's own import.meta.env object injection.
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

const SUPABASE_URL = __SUPABASE_URL__;
const SUPABASE_ANON_KEY = __SUPABASE_ANON_KEY__;

/**
 * Supabase storage adapter backed by chrome.storage.local.
 * Persists the auth session across popup open/close cycles.
 */
const chromeStorageAdapter = {
  getItem(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve((result[key] as string | undefined) ?? null);
      });
    });
  },
  setItem(key: string, value: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },
  removeItem(key: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, resolve);
    });
  },
};

/**
 * Singleton Supabase client for the browser extension.
 * All extension code must import this — never call createClient() directly.
 */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
