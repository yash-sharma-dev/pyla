import type { User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

/**
 * React hook that tracks the Supabase auth session in the browser extension.
 *
 * Session bootstrapping after web OAuth is handled by the background service
 * worker (background.ts), which watches tabs.onUpdated for the /auth/extension
 * bridge URL and calls setSession() — writing tokens to chrome.storage.local.
 *
 * On mount this hook:
 *   1. Subscribes to onAuthStateChange (catches setSession() fired by background
 *      if the popup happens to be open at the right moment)
 *   2. Server-validates any existing session via getUser()
 *   3. Polls every 3 s while unauthenticated so the popup detects a completed
 *      web sign-in within 3 seconds of being reopened
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

    // Server-validate any existing session on mount.
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
