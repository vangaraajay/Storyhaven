import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import ProfileForm from "./ProfileForm";

async function ProfileContent() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
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

export default function ProfilePage() {
  return (
    <main>
      <h1>Create profile</h1>
      <p>
        <Link href="/">Back to Storyhaven</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <ProfileContent />
      </Suspense>
    </main>
  );
}
