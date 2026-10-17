import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

async function LoginContent() {
  try {
    const session = await auth0.getSession();
    if (session?.user) {
      redirect("/");
    }
  } catch {
    // Auth0 unavailable — still show the login page.
  }

  return (
    <>
      <p>Log in or sign up to enter the haven.</p>
      <p>
        <a href="/auth/login?returnTo=/">Log in</a>
      </p>
      <p>
        <a href="/auth/login?screen_hint=signup&returnTo=/">Sign up</a>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="login-page">
      <h1>Storyhaven</h1>
      <Suspense fallback={<p>Loading…</p>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}
