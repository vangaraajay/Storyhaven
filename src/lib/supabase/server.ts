import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/**
 * Server-only Supabase client.
 * Uses the service role after Auth0 has already authenticated the user.
 * Never import this into client components.
 */
export function createServiceSupabaseClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

/** Optional: Auth0 ID token client for true JWT+RLS (needs role claim). */
export function createUserSupabaseClient(idToken: string): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      accessToken: async () => idToken,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
