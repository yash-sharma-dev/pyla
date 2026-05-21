import type { Session } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; session: Session }
  | { status: "unauthenticated" };

/**
 * React hook that tracks the Supabase auth session in the browser extension.
 * Hydrates from chrome.storage.local on mount and subscribes to auth state changes.
 *
 * @returns `{ authState, signIn, signOut, signInError, loading }`
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [signInError, setSignInError] = useState<string | null>(null);

  // Hydrate session on mount + subscribe to changes
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setAuthState(
        data.session
          ? { status: "authenticated", session: data.session }
          : { status: "unauthenticated" },
      );
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(
        session
          ? { status: "authenticated", session }
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
