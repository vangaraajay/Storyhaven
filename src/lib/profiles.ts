import type { User } from "@auth0/nextjs-auth0/types";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { parseAvatar, type Avatar } from "@/lib/avatar/types";

export type Profile = {
  id: string;
  auth0_sub: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  /** Character creator data (profiles.avatar jsonb). Null = never customised. */
  avatar: Avatar | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = {
  display_name: string;
  avatar_url?: string | null;
  avatar?: Avatar | null;
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
  const avatar = input.avatar ? parseAvatar(input.avatar) : null;
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        auth0_sub: user.sub,
        email: user.email ?? null,
        display_name: displayName,
        avatar_url: avatarUrl,
        ...(avatar ? { avatar } : {}),
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

/** Updates only profiles.avatar for an existing profile. */
export async function saveAvatar(user: User, avatar: Avatar): Promise<void> {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar })
    .eq("auth0_sub", user.sub)
    .select("id");

  if (error) {
    throw new Error(`Failed to save character: ${error.message}`);
  }
  if (!data?.length) {
    throw new Error("Create your profile before choosing a character.");
  }
}
