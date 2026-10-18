import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { DAILY_STORY } from "./story";

async function DailyStoryGate({ children }: { children: ReactNode }) {
  const session = await auth0.getSession();
  if (!session?.user) {
    redirect("/pages/login");
  }
  return children;
}

const forumHref = `/pages/forum?mode=per_book&book=${encodeURIComponent(DAILY_STORY.title)}&from=daily-story`;

export default function DailyStoryPage() {
  return (
    <main className="daily-story-page">
      <p>
        <Link href="/" className="daily-story-back">
          ← Back to Storyhaven
        </Link>
      </p>
      <Suspense fallback={<p>Loading…</p>}>
        <DailyStoryGate>
          <article className="daily-story">
            <p className="daily-story-label">Daily Story</p>
            <h1>{DAILY_STORY.title}</h1>
            <p className="daily-story-author">by {DAILY_STORY.author}</p>
            <p className="daily-story-forum">
              <Link href={forumHref} className="daily-story-forum-link">
                Discuss &quot;{DAILY_STORY.title}&quot; in the Forum →
              </Link>
            </p>
            {DAILY_STORY.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </article>
        </DailyStoryGate>
      </Suspense>
    </main>
  );
}
