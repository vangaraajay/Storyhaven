"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => <p>Loading Phaser…</p>,
});

export default function PhaserPage() {
  return <PhaserGame />;
}
