import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { DAILY_STORY } from "./story";
import Icon from "@/components/pixel/Icon";
import PixelLink from "@/components/pixel/PixelLink";
import LoadingScreen from "@/components/pixel/LoadingScreen";

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
        <PixelLink href="/">
          <Icon name="arrow_left" size={1} /> Back to Storyhaven
        </PixelLink>
      </p>
      <Suspense fallback={<LoadingScreen scene="story" />}>
        <DailyStoryGate>
          <article className="daily-story">
            <p className="daily-story-label">Daily Story</p>
            <h1>{DAILY_STORY.title}</h1>
            <p className="daily-story-author">by {DAILY_STORY.author}</p>
            <p className="daily-story-forum">
              <PixelLink href={forumHref}>
                Discuss &quot;{DAILY_STORY.title}&quot; in the Forum <Icon name="arrow_right" size={1} />
              </PixelLink>
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
