import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { randomAvatar } from "@/lib/avatar/options";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import CreateClient from "./CreateClient";

/** Only same-site paths; blocks open redirects like //evil.com. */
function safeReturnTo(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
}

async function CreateContent({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const session = await auth0.getSession();
  const user = session?.user;
  if (!user) redirect("/pages/login");

  const profile = await getProfile(user);
  if (!isProfileComplete(profile)) redirect("/pages/profile");

  const { returnTo } = await searchParams;
  return (
    <CreateClient
      // Random start (picked here so server and client markup agree) when nothing is saved.
      initial={profile?.avatar ?? randomAvatar()}
      hasSaved={Boolean(profile?.avatar)}
      returnTo={safeReturnTo(returnTo)}
    />
  );
}

/** Server wrapper: auth + load profiles.avatar, then the client creator. */
export default function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <CreateContent searchParams={searchParams} />
    </Suspense>
  );
}
