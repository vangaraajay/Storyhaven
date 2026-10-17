import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { listLogs } from "@/lib/logging";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import CreateLogForms from "./CreateLogForms";
import LibraryEntries from "./LibraryEntries";

async function LibraryContent() {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile");
  }

  const logs = await listLogs(profile.id);

  return (
    <>
      <p>Logging as {profile.display_name}</p>
      <CreateLogForms />
      <LibraryEntries
        books={logs.books}
        movies={logs.movies}
        albums={logs.albums}
      />
    </>
  );
}

export default function LibraryPage() {
  return (
    <main>
      <h1>Library</h1>
      <p>
        <Link href="/">Back to Storyhaven</Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <LibraryContent />
      </Suspense>
    </main>
  );
}
