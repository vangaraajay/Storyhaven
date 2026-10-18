import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import BackgroundMusic from "@/components/audio/BackgroundMusic";
import MotionProvider from "@/components/pixel/MotionProvider";
import "./globals.css";

const pixelFont = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

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
    <html lang="en" className={pixelFont.variable} style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <body>
        <MotionProvider />
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
