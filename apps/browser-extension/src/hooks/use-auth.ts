import type { User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

const PYLA_WEB_ORIGIN = "https://pyla-web.vercel.app";

/**
 * Waits briefly for React to finish writing to localStorage after the bridge
 * page mounts, then reads pyla-ext-tokens from the tab and calls setSession().
 * Returns true if setSession() succeeded (triggers onAuthStateChange).
 */
async function tryBootstrapFromTab(tabId: number): Promise<boolean> {
  await new Promise<void>((r) => setTimeout(r, 800));
  try {
    const [result] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => {
        const v = window.localStorage.getItem("pyla-ext-tokens");
        if (v) window.localStorage.removeItem("pyla-ext-tokens");
        return v;
      },
    });
    const json = result?.result as string | null;
    if (!json) return false;
    const { access_token, refresh_token } = JSON.parse(json) as {
      access_token: string;
      refresh_token: string;
    };
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return !error;
  } catch {
    return false;
  }
}

/**
 * React hook that tracks the Supabase auth session in the browser extension.
 *
 * On mount it:
 *   1. Subscribes to onAuthStateChange first (so setSession() events aren't missed)
 *   2. Watches browser.tabs.onUpdated for the /auth/extension bridge URL and
 *      reads tokens from localStorage via executeScript, then calls setSession()
 *   3. Falls back to server-validated getUser() for an existing extension session
 *   4. Polls every 3 s via getUser() while unauthenticated so an already-active
 *      extension session is detected on popup open
 *
 * @returns `{ authState, signIn, signOut, signInError, loading }`
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;

    const stopPolling = () => {
      if (pollId !== null) {
        clearInterval(pollId);
        pollId = null;
      }
    };

    const startPolling = () => {
      if (pollId !== null) return;
      pollId = setInterval(() => {
        void supabase.auth.getUser().then(({ data, error }) => {
          if (!error && data.user) {
            setAuthState({ status: "authenticated", user: data.user });
            stopPolling();
          }
        });
      }, 3000);
    };

    // Subscribe BEFORE any async work so auth events from setSession() are never missed.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuthState({ status: "authenticated", user: session.user });
        stopPolling();
      } else {
        setAuthState({ status: "unauthenticated" });
        startPolling();
      }
    });

    // Watch for the bridge tab so we can bootstrap the session from localStorage.
    const handleTabUpdate = (
      tabId: number,
      changeInfo: { status?: string },
      tab: { url?: string },
    ) => {
      if (changeInfo.status !== "complete") return;
      if (!tab.url?.startsWith(`${PYLA_WEB_ORIGIN}/auth/extension`)) return;
      void tryBootstrapFromTab(tabId);
    };

    browser.tabs.onUpdated.addListener(handleTabUpdate);

    // Server-validate any existing extension session on mount.
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setAuthState({ status: "authenticated", user: data.user });
      } else {
        setAuthState({ status: "unauthenticated" });
        startPolling();
      }
    });

    return () => {
      subscription.unsubscribe();
      stopPolling();
      browser.tabs.onUpdated.removeListener(handleTabUpdate);
    };
  }, []);

  const handleSignIn = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setSignInError(null);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setSignInError(error.message);
        return false;
      }
      return true;
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    authState,
    signIn: handleSignIn,
    signOut: handleSignOut,
    signInError,
    loading: authState.status === "loading",
  };
}
