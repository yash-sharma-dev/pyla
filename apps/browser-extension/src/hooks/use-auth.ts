import type { User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

/**
 * Runs the full Google OAuth flow inside a Chrome identity popup and
 * bootstraps the Supabase session from the returned tokens.
 * Throws on failure; callers should catch and surface the error.
 */
async function launchGoogleOAuth(): Promise<void> {
  const redirectUrl = chrome.identity.getRedirectURL();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) throw error ?? new Error("No OAuth URL returned");

  const callbackUrl = await new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url: data.url, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!responseUrl) {
          reject(new Error("No response URL from OAuth flow"));
        } else {
          resolve(responseUrl);
        }
      },
    );
  });

  // Supabase appends tokens as hash fragments on the redirect URL.
  const params = new URLSearchParams(new URL(callbackUrl).hash.slice(1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) throw new Error("No tokens in OAuth callback");

  const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
  if (sessionError) throw sessionError;
}

/**
 * React hook that tracks the Supabase auth session in the browser extension.
 *
 * On mount it:
 *   1. Subscribes to onAuthStateChange (so setSession() from signInWithGoogle
 *      updates state immediately without a manual poll)
 *   2. Server-validates any existing session via getUser()
 *   3. Polls every 3 s while unauthenticated (handles edge cases where the
 *      session was set outside this hook's lifetime)
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

    // Subscribe BEFORE any async work so setSession() events are never missed.
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
      await launchGoogleOAuth();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed";
      // Suppress user-cancelled errors — not an actionable error state.
      if (!msg.toLowerCase().includes("cancel") && !msg.includes("not approve")) {
        setSignInError(msg);
      }
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
