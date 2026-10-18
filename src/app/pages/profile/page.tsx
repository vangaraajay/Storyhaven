import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import ProfileForm from "./ProfileForm";
import PixelLink from "@/components/pixel/PixelLink";

async function ProfileContent() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  // Profile editing is gone; characters are edited at /create.
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
        defaultAvatar={profile?.avatar ?? null}
      />
    </>
  );
}

export default function ProfilePage() {
  return (
    <main>
      <h1>Profile</h1>
      <p>
        <PixelLink href="/">Back to Storyhaven</PixelLink>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}
