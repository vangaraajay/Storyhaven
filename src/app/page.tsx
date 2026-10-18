import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import HavenHome, { type HavenAuth } from "./haven/HavenHome";

async function Haven() {
  let session = null;
  try {
    session = await auth0.getSession();
  } catch {
    redirect("/pages/login");
  }

  const user = session?.user;
  if (!user) {
    redirect("/pages/login");
  }

  const auth: HavenAuth = {
    isLoggedIn: true,
    displayName: user.name ?? user.nickname ?? user.email ?? null,
    needsProfile: true,
  };

  let needsAvatar = false;
  try {
    const profile = await getProfile(user);
    auth.needsProfile = !isProfileComplete(profile);
    auth.displayName = profile?.display_name ?? auth.displayName;
    needsAvatar = !auth.needsProfile && !profile?.avatar;
  } catch {
    // Profile fetch failed; still allow the haven once logged in.
  }

  // Post-signup: finish by creating a character (redirect outside the try/catch).
  if (needsAvatar) {
    redirect("/create");
  }

  return <HavenHome auth={auth} />;
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="haven-loading" role="status">
          Opening Storyhaven…
        </div>
      }
    >
      <Haven />
    </Suspense>
  );
}
