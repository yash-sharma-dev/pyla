import type { User } from "@supabase/supabase-js";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "~/lib/supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: User }
  | { status: "unauthenticated" };

const PYLA_WEB_ORIGIN = "https://pyla-web.vercel.app";
const SESSION_COOKIE = "pyla-ext-session";

/**
 * Reads the session cookie written by the web app's /auth/callback route after
 * Google OAuth and calls supabase.setSession() to bootstrap the extension's
 * session from those tokens. Returns true if setSession() succeeded (which
 * triggers onAuthStateChange so callers don't need to update state manually).
 * Removes the cookie immediately after a successful bootstrap.
 */
async function tryBootstrapFromCookie(): Promise<boolean> {
  try {
    const cookie = await browser.cookies.get({ url: PYLA_WEB_ORIGIN, name: SESSION_COOKIE });
    if (!cookie?.value) return false;
    const { access_token, refresh_token } = JSON.parse(cookie.value) as {
      access_token: string;
      refresh_token: string;
    };
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (!error) {
      await browser.cookies.remove({ url: PYLA_WEB_ORIGIN, name: SESSION_COOKIE });
    }
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
 *   2. Tries to bootstrap from the cookie the web app sets after OAuth
 *   3. Falls back to server-validated getUser() for an existing extension session
 *   4. Polls every 3 s (cookie → getUser) while unauthenticated so the popup
 *      detects a web-app sign-in within 3 seconds without a manual reload
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
        void tryBootstrapFromCookie().then((ok) => {
          if (ok) return; // setSession() fired onAuthStateChange; it handles state + stopPolling
          void supabase.auth.getUser().then(({ data, error }) => {
            if (!error && data.user) {
              setAuthState({ status: "authenticated", user: data.user });
              stopPolling();
            }
          });
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

    // Try cookie first (handles returning after web OAuth), then server-validate
    // the extension's own stored session, then start polling if both miss.
    void tryBootstrapFromCookie().then((ok) => {
      if (ok) return; // onAuthStateChange handles state; already subscribed above
      void supabase.auth.getUser().then(({ data, error }) => {
        if (!error && data.user) {
          setAuthState({ status: "authenticated", user: data.user });
        } else {
          setAuthState({ status: "unauthenticated" });
          startPolling();
        }
      });
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
