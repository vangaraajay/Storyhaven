import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete, type Profile } from "@/lib/profiles";

async function AuthStatus() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    return (
      <>
        <p>Not signed in</p>
        <p>
          <a href="/auth/login">Log in</a>
        </p>
        <p>
          <a href="/auth/login?screen_hint=signup">Create account</a>
        </p>
      </>
    );
  }

  let profile: Profile | null = null;
  let profileError: string | null = null;

  try {
    profile = await getProfile(user);
  } catch (error) {
    profileError =
      error instanceof Error ? error.message : "Failed to load profile.";
  }

  if (profileError) {
    return (
      <>
        <p>Signed in as {user.email ?? user.name ?? user.sub}</p>
        <p>Profile error: {profileError}</p>
        <p>
          <Link href="/pages/profile-creation">Create profile</Link>
        </p>
        <p>
          <a href="/auth/logout">Log out</a>
        </p>
      </>
    );
  }

  if (!isProfileComplete(profile)) {
    redirect("/pages/profile-creation");
  }

  return (
    <>
      <p>Signed in as {profile?.display_name ?? user.email ?? user.sub}</p>
      <p>Email: {profile?.email ?? user.email ?? "—"}</p>
      <p>Profile id: {profile?.id}</p>
      <p>
        <a href="/auth/logout">Log out</a>
      </p>
    </>
  );
}

export default function Home() {
  return (
    <main>
      <h1>Storyhaven</h1>
      <Suspense fallback={<p>Checking session…</p>}>
        <AuthStatus />
      </Suspense>
      <p>
        <Link href="/phaser">Phaser</Link>
      </p>
      <p>
        <Link href="/pages">Basic page</Link>
      </p>
    </main>
  );
}
