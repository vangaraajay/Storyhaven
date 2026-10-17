import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Storyhaven",
  other: {
    "color-scheme": "dark",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
