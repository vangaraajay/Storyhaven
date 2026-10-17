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
    </main>
  );
}
