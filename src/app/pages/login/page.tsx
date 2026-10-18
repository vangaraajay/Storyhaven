import { Suspense } from "react";
import { redirect } from "next/navigation";
import Avatar from "@/components/pixel/Avatar";
import PixelFrame from "@/components/pixel/PixelFrame";
import PixelLink from "@/components/pixel/PixelLink";
import { auth0 } from "@/lib/auth0";
import styles from "./login.module.css";

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
      <p className={styles.tagline}>Log in or sign up to enter the haven.</p>
      <div className={styles.buttons}>
        <PixelLink href="/auth/login?returnTo=/">Log in</PixelLink>
        <PixelLink href="/auth/login?screen_hint=signup&returnTo=/">Sign up</PixelLink>
      </div>
      <p className={styles.hint}>Log your books, movies and albums. Decorate your shelf.</p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <div className={styles.main}>
        <PixelFrame className={styles.card}>
          <h1 className={styles.title}>Storyhaven</h1>
          <Suspense fallback={<p>Loading…</p>}>
            <LoginContent />
          </Suspense>
        </PixelFrame>
      </div>
      <div className={styles.floor} aria-hidden>
        <div className={styles.hero}>
          <Avatar scale={4} blink />
        </div>
      </div>
    </main>
  );
}
