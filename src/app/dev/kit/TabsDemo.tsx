"use client";

import { useState } from "react";
import PixelTabs from "@/components/pixel/PixelTabs";

const TABS = [
  { id: "one", label: "Discover" },
  { id: "two", label: "Top" },
  { id: "three", label: "New" },
];

export default function TabsDemo() {
  const [value, setValue] = useState("one");
  return <PixelTabs tabs={TABS} value={value} onChange={setValue} aria-label="Demo tabs" />;
}
