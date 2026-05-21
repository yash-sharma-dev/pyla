import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/** A function that unsubscribes an auth state listener */
export type Unsubscribe = () => void;

/**
 * Signs a user in with email and password.
 *
 * @param client - A Supabase client instance
 * @param email - The user's email address
 * @param password - The user's password
 * @returns The active Session on success
 * @throws If credentials are invalid or the request fails
 */
export async function signInWithEmail(
  client: SupabaseClient<Database>,
  email: string,
  password: string,
): Promise<Session> {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw new Error(`[pyla/supabase] signInWithEmail: ${error.message}`);
  if (!data.session)
    throw new Error("[pyla/supabase] signInWithEmail: no session returned");
  return data.session;
}

/**
 * Signs the current user out and clears the local session.
 *
 * @param client - An authenticated Supabase client
 */
export async function signOut(
  client: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await client.auth.signOut();
  if (error) throw new Error(`[pyla/supabase] signOut: ${error.message}`);
}

/**
 * Returns the currently active session, or `null` if unauthenticated.
 *
 * @param client - A Supabase client instance
 * @returns The active Session or null
 */
export async function getSession(
  client: SupabaseClient<Database>,
): Promise<Session | null> {
  const {
    data: { session },
  } = await client.auth.getSession();
  return session;
}

/**
 * Initiates Google OAuth sign-in flow. Redirects the browser to Google's
 * consent screen; on success Google redirects back to `redirectTo`.
 *
 * @param client - A Supabase client instance (browser client)
 * @param redirectTo - The URL Supabase should redirect to after OAuth (your /auth/callback)
 * @throws If the OAuth initiation fails
 */
export async function signInWithGoogle(
  client: SupabaseClient<Database>,
  redirectTo: string,
): Promise<void> {
  const { error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw new Error(`[pyla/supabase] signInWithGoogle: ${error.message}`);
}

/**
 * Subscribes to auth state changes (sign-in, sign-out, token refresh).
 *
 * @param client - A Supabase client instance
 * @param callback - Called with the new Session (or null on sign-out)
 * @returns An unsubscribe function — call it to stop listening
 */
export function onAuthChange(
  client: SupabaseClient<Database>,
  callback: (session: Session | null) => void,
): Unsubscribe {
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.unsubscribe();
}
