import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Storyhaven</h1>
      <p>
        <Link href="/phaser">Phaser</Link>
      </p>
      <p>
        <Link href="/page">Basic page</Link>
      </p>
    </main>
  );
}
