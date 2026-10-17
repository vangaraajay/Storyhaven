import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import { getPostById, getCommentsByPostId, buildCommentTree } from "@/lib/forum";
import ThreadView from "./ThreadView";
import "../forum.css";

export const instant = false;

interface ThreadPageProps {
  params: Promise<{
    postId: string;
  }>;
}

async function ThreadContent({ params }: ThreadPageProps) {
  const { postId } = await params;

  // Check auth session
  let profile = null;
  let isLoggedIn = false;

  try {
    const session = await auth0.getSession();
    const user = session?.user;
    if (user) {
      profile = await getProfile(user);
      isLoggedIn = Boolean(profile && isProfileComplete(profile));
    }
  } catch {
    // Guest viewing
  }

  // Fetch post and comments
  const post = await getPostById(postId, profile?.id);
  if (!post) {
    notFound();
  }

  const comments = await getCommentsByPostId(postId, profile?.id);
  const commentTree = buildCommentTree(comments);

  return (
    <ThreadView
      post={post}
      commentTree={commentTree}
      isLoggedIn={isLoggedIn}
    />
  );
}

export default function ThreadPage(props: ThreadPageProps) {
  return (
    <main className="forum-main" suppressHydrationWarning>
      <Suspense
        fallback={
          <div className="forum-thread-container" style={{ padding: "3rem 1rem", textAlign: "center", fontFamily: "var(--forum-font-mono)", fontSize: "0.85rem", color: "var(--forum-text-secondary)" }}>
            <span style={{ display: "inline-block", marginRight: "0.5rem" }}>⏳</span>
            Loading discussion…
          </div>
        }
      >
        <ThreadContent {...props} />
      </Suspense>
    </main>
  );
}
