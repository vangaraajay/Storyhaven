import { notFound } from "next/navigation";
import KitBody from "./KitBody";

/** Dev-only: every pixel component in every state. 404s in production. */
export default function KitPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <KitBody />;
}
