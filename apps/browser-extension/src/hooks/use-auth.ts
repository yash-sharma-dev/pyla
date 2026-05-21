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
    // getUser() hits the Supabase server to validate the token — unlike
    // getSession() which only reads local storage and returns stale data
    // if the user has signed out from another device or the web app.
    void supabase.auth.getUser().then(({ data, error }) => {
      setAuthState(
        !error && data.user
          ? { status: "authenticated", user: data.user }
          : { status: "unauthenticated" },
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(
        session?.user
          ? { status: "authenticated", user: session.user }
          : { status: "unauthenticated" },
      );
    });

    return () => subscription.unsubscribe();
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
