import type { User } from "@auth0/nextjs-auth0/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  auth0_sub: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = {
  display_name: string;
  avatar_url?: string | null;
};

export function isProfileComplete(profile: Profile | null): boolean {
  return Boolean(profile?.display_name?.trim());
}

export async function getProfile(user: User): Promise<Profile | null> {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth0_sub", user.sub)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  return (data as Profile | null) ?? null;
}

export async function saveProfile(
  user: User,
  input: ProfileInput,
): Promise<Profile> {
  const displayName = input.display_name.trim();
  if (!displayName) {
    throw new Error("Display name is required.");
  }

  const avatarUrl = input.avatar_url?.trim() || null;
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        auth0_sub: user.sub,
        email: user.email ?? null,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "auth0_sub" },
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to save profile: ${error.message}`);
  }

  return data as Profile;
}
