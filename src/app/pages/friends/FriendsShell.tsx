"use client";

import Link from "next/link";
import type {
  ChatGroupSummary,
  ChatMessage,
  FriendRow,
  MatchCandidate,
  PublicProfile,
} from "@/lib/friends";
import type { HavenMatchState } from "@/lib/match-drop";
import ChatPanel from "./ChatPanel";
import MatchDropCard from "./MatchDropCard";
import MatchPanel from "./MatchPanel";
import NewGroupForm from "./NewGroupForm";

export type FriendsShellProps = {
  myId: string;
  mode: "match" | "dm" | "group";
  friends: FriendRow[];
  groups: ChatGroupSummary[];
  incoming: MatchCandidate[];
  outgoing: MatchCandidate[];
  matches: MatchCandidate[];
  havenState?: HavenMatchState;
  initialDraft?: string | null;
  dm?: {
    friendshipId: string;
    other: PublicProfile;
    messages: ChatMessage[];
  } | null;
  group?: {
    summary: ChatGroupSummary;
    messages: ChatMessage[];
  } | null;
  showNewGroup?: boolean;
};

export default function FriendsShell({
  myId,
  mode,
  friends,
  groups,
  incoming,
  outgoing,
  matches,
  havenState,
  initialDraft = null,
  dm,
  group,
  showNewGroup = false,
}: FriendsShellProps) {
  return (
    <div className="friends-layout">
      <aside className="friends-rail">
        <div className="friends-rail-section">
          <h2>Friends</h2>
          {friends.length === 0 ? (
            <p className="friends-muted">
              No friends yet — find people with similar tastes.
            </p>
          ) : (
            <ul className="friends-rail-list">
              {friends.map((friend) => (
                <li key={friend.friendshipId}>
                  <Link
                    href={`/pages/friends?with=${friend.profile.id}`}
                    className={
                      mode === "dm" && dm?.other.id === friend.profile.id
                        ? "active"
                        : undefined
                    }
                  >
                    {friend.profile.display_name ?? "Unnamed"}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="friends-rail-section">
          <h2>Group chats</h2>
          {groups.length === 0 ? (
            <p className="friends-muted">No groups yet.</p>
          ) : (
            <ul className="friends-rail-list">
              {groups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/pages/friends?group=${g.id}`}
                    className={
                      mode === "group" && group?.summary.id === g.id
                        ? "active"
                        : undefined
                    }
                  >
                    {g.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/pages/friends?newGroup=1"
            className="friends-rail-action"
          >
            + New group
          </Link>
        </div>

        <Link href="/pages/friends" className="friends-find-btn">
          Find friends
        </Link>
      </aside>

      <div className="friends-main">
        {showNewGroup ? (
          <NewGroupForm friends={friends} />
        ) : mode === "dm" && dm ? (
          <ChatPanel
            kind="dm"
            title={dm.other.display_name ?? "Friend"}
            friendshipId={dm.friendshipId}
            otherId={dm.other.id}
            myId={myId}
            messages={dm.messages}
            initialDraft={initialDraft}
          />
        ) : mode === "group" && group ? (
          <ChatPanel
            kind="group"
            title={group.summary.name}
            groupId={group.summary.id}
            myId={myId}
            messages={group.messages}
          />
        ) : (
          <>
            <MatchDropCard initialState={havenState} myId={myId} />
            <MatchPanel
              incoming={incoming}
              outgoing={outgoing}
              matches={matches}
            />
          </>
        )}
      </div>
    </div>
  );
}
