import type { User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";
import { EXTENSION_RUNTIME_MESSAGE } from "~/constants/extension-runtime";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

/**
 * React hook that tracks the Supabase auth session in the browser extension.
 *
 * On mount it:
 *   1. Subscribes to onAuthStateChange (catches setSession() fired within the
 *      same client instance, e.g. signOut)
 *   2. Server-validates any existing session via getUser()
 *   3. Polls every 3 s while unauthenticated
 *
 * Sign-in is delegated to the background service worker via sendMessage because
 * chrome.identity is only available there. On success the background writes
 * the session to chrome.storage.local; the popup reads it via getUser().
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

    // Subscribe BEFORE any async work so events from signOut are never missed.
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

  const handleSignInWithGoogle = useCallback(async (): Promise<void> => {
    setSignInError(null);
    try {
      const response = await browser.runtime.sendMessage({
        type: EXTENSION_RUNTIME_MESSAGE.SIGN_IN_GOOGLE,
      }) as { ok: boolean; error?: string } | undefined;

      if (response?.ok) {
        // Background wrote the session to chrome.storage.local via setSession().
        // Read it back now — onAuthStateChange won't fire cross-instance.
        const { data, error } = await supabase.auth.getUser();
        if (!error && data.user) {
          setAuthState({ status: "authenticated", user: data.user });
        }
      } else if (response?.error) {
        const msg = response.error;
        if (!msg.toLowerCase().includes("cancel") && !msg.includes("not approve")) {
          setSignInError(msg);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      setSignInError(msg);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    authState,
    signInWithGoogle: handleSignInWithGoogle,
    signOut: handleSignOut,
    signInError,
    loading: authState.status === "loading",
  };
}
