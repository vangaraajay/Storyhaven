import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import ProfileForm from "./ProfileForm";

async function ProfileCreationContent() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/auth/login?returnTo=/pages/profile-creation");
  }

  const profile = await getProfile(user);
  if (isProfileComplete(profile)) {
    redirect("/");
  }

  return (
    <>
      <p>Signed in as {user.email ?? user.sub}</p>
      <ProfileForm
        defaultDisplayName={
          profile?.display_name ?? user.name ?? user.nickname ?? ""
        }
        defaultAvatarUrl={profile?.avatar_url ?? user.picture ?? ""}
      />
    </>
  );
}

export default function ProfileCreationPage() {
  return (
    <main>
      <h1>Create profile</h1>
      <p>
        <Link href="/">Home</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <ProfileCreationContent />
      </Suspense>
    </main>
  );
}
