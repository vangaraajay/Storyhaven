import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { listLogs } from "@/lib/logging";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import LogEntries from "./LogEntries";
import LoggingForms from "./LoggingForms";

async function LoggingContent() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/auth/login?returnTo=/pages/logging");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile-creation");
  }

  const logs = await listLogs(profile.id);

  return (
    <>
      <p>Logging as {profile.display_name}</p>
      <LoggingForms />
      <LogEntries
        books={logs.books}
        movies={logs.movies}
        albums={logs.albums}
      />
    </>
  );
}

export default function LoggingPage() {
  return (
    <main>
      <h1>Logging</h1>
      <p>
        <Link href="/">Home</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <LoggingContent />
      </Suspense>
    </main>
  );
}
