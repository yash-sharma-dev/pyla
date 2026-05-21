import type { User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

/**
 * React hook that tracks the Supabase auth session in the browser extension.
 * Validates against the server on every mount so stale local storage can never
 * produce a false "authenticated" state after the user signs out elsewhere.
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

    // Poll every 3 s until a valid user appears. Needed because
    // onAuthStateChange only fires within this JS context — it cannot detect
    // a sign-in that happens in the web app tab (separate context/window).
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

    // Validate against the server on mount — getSession() only reads local
    // storage and would return stale data after a sign-out elsewhere.
    void supabase.auth.getUser().then(({ data, error }) => {
      if (!error && data.user) {
        setAuthState({ status: "authenticated", user: data.user });
      } else {
        setAuthState({ status: "unauthenticated" });
        startPolling();
      }
    });

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
