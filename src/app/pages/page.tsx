import Link from "next/link";

export default function BasicPage() {
  return (
    <main>
      <h1>Basic page</h1>
      <p>
        <Link href="/">Home</Link>
      </p>
      <p>
        <Link href="/phaser">Phaser</Link>
      </p>
      <p>
        <a href="/auth/login">Log in</a>
      </p>
      <p>
        <Link href="/pages/profile-creation">Create profile</Link>
      </p>
      <p>
        <Link href="/pages/logging">Logging</Link>
      </p>
    </main>
  );
}
