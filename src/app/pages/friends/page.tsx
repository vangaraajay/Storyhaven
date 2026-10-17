import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";
import {
  assertGroupMember,
  getAcceptedFriendshipBetween,
  listAcceptedFriends,
  listDmMessages,
  listGroupMessages,
  listIncomingRequests,
  listMatchCandidates,
  listMyGroups,
  listOutgoingRequests,
} from "@/lib/friends";
import { getProfile, isProfileComplete } from "@/lib/profiles";
import FriendsShell from "./FriendsShell";

type FriendsPageProps = {
  searchParams: Promise<{
    with?: string;
    group?: string;
    newGroup?: string;
  }>;
};

async function FriendsContent({ searchParams }: FriendsPageProps) {
  const session = await auth0.getSession();
  const user = session?.user;

  if (!user) {
    redirect("/pages/login");
  }

  const profile = await getProfile(user);
  if (!isProfileComplete(profile) || !profile) {
    redirect("/pages/profile");
  }

  const params = await searchParams;
  const withId = params.with?.trim() || null;
  const groupId = params.group?.trim() || null;
  const showNewGroup = params.newGroup === "1";

  const [friends, groups, incoming, outgoing, matches] = await Promise.all([
    listAcceptedFriends(profile.id),
    listMyGroups(profile.id),
    listIncomingRequests(profile.id),
    listOutgoingRequests(profile.id),
    listMatchCandidates(profile.id),
  ]);

  let mode: "match" | "dm" | "group" = "match";
  let dm: {
    friendshipId: string;
    other: (typeof friends)[number]["profile"];
    messages: Awaited<ReturnType<typeof listDmMessages>>;
  } | null = null;
  let group:
    | {
        summary: (typeof groups)[number];
        messages: Awaited<ReturnType<typeof listGroupMessages>>;
      }
    | null = null;

  if (withId && !showNewGroup) {
    const friendship = await getAcceptedFriendshipBetween(profile.id, withId);
    if (!friendship) {
      redirect("/pages/friends");
    }
    const other =
      friends.find((f) => f.profile.id === withId)?.profile ?? null;
    if (!other) {
      redirect("/pages/friends");
    }
    const messages = await listDmMessages(friendship.id);
    mode = "dm";
    dm = { friendshipId: friendship.id, other, messages };
  } else if (groupId && !showNewGroup) {
    const isMember = await assertGroupMember(groupId, profile.id);
    if (!isMember) {
      redirect("/pages/friends");
    }
    const summary = groups.find((g) => g.id === groupId);
    if (!summary) {
      redirect("/pages/friends");
    }
    const messages = await listGroupMessages(groupId);
    mode = "group";
    group = { summary, messages };
  }

  return (
    <FriendsShell
      myId={profile.id}
      mode={showNewGroup ? "match" : mode}
      friends={friends}
      groups={groups}
      incoming={incoming}
      outgoing={outgoing}
      matches={matches}
      dm={dm}
      group={group}
      showNewGroup={showNewGroup}
    />
  );
}

export default function FriendsPage(props: FriendsPageProps) {
  return (
    <main className="friends-page">
      <header className="friends-page-header">
        <h1>Friends</h1>
        <Link href="/">← Back to Storyhaven</Link>
      </header>
      <Suspense fallback={<p>Loading friends…</p>}>
        <FriendsContent searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
