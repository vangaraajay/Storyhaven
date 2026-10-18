"use client";

import { useActionState, useState, useTransition } from "react";
import {
  formatMatchWhy,
  type MatchCandidate,
} from "@/lib/friends";
import {
  acceptRequestAction,
  addFriendAction,
  cancelRequestAction,
  declineRequestAction,
  searchFriendsAction,
  type FriendsActionState,
} from "./actions";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput from "@/components/pixel/PixelInput";

const initial: FriendsActionState = { error: null };

type MatchPanelProps = {
  incoming: MatchCandidate[];
  outgoing: MatchCandidate[];
  matches: MatchCandidate[];
};

function CandidateActions({ candidate }: { candidate: MatchCandidate }) {
  const [addState, addAction, addPending] = useActionState(
    addFriendAction,
    initial,
  );
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptRequestAction,
    initial,
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineRequestAction,
    initial,
  );
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelRequestAction,
    initial,
  );

  const error =
    addState.error ||
    acceptState.error ||
    declineState.error ||
    cancelState.error;

  return (
    <div className="friends-candidate-actions">
      {candidate.relationship === "none" ||
      candidate.relationship === "declined" ? (
        <form action={addAction}>
          <input
            type="hidden"
            name="addresseeId"
            value={candidate.profile.id}
          />
          <PixelButton type="submit" disabled={addPending}>
            {addPending ? "Sending…" : "Add friend"}
          </PixelButton>
        </form>
      ) : null}

      {candidate.relationship === "outgoing" && candidate.friendshipId ? (
        <form action={cancelAction}>
          <input
            type="hidden"
            name="friendshipId"
            value={candidate.friendshipId}
          />
          <span className="friends-badge">Pending</span>
          <PixelButton type="submit" disabled={cancelPending}>
            Cancel
          </PixelButton>
        </form>
      ) : null}

      {candidate.relationship === "incoming" && candidate.friendshipId ? (
        <div className="friends-inline-forms">
          <form action={acceptAction}>
            <input
              type="hidden"
              name="friendshipId"
              value={candidate.friendshipId}
            />
            <PixelButton type="submit" disabled={acceptPending}>
              Accept
            </PixelButton>
          </form>
          <form action={declineAction}>
            <input
              type="hidden"
              name="friendshipId"
              value={candidate.friendshipId}
            />
            <PixelButton type="submit" disabled={declinePending}>
              Decline
            </PixelButton>
          </form>
        </div>
      ) : null}

      {candidate.relationship === "friends" ? (
        <span className="friends-badge">Friends</span>
      ) : null}

      {error && <p className="friends-error">{error}</p>}
    </div>
  );
}

function CandidateRow({ candidate }: { candidate: MatchCandidate }) {
  return (
    <li className="friends-candidate">
      <div>
        <p className="friends-candidate-name">
          {candidate.profile.display_name ?? "Unnamed"}
        </p>
        <p className="friends-muted">
          Score {candidate.score} — {formatMatchWhy(candidate.breakdown)}
        </p>
      </div>
      <CandidateActions candidate={candidate} />
    </li>
  );
}

export default function MatchPanel({
  incoming,
  outgoing,
  matches,
}: MatchPanelProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MatchCandidate[] | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setSearchResults(null);
      setSearchError(null);
      return;
    }

    startTransition(async () => {
      const result = await searchFriendsAction(value);
      setSearchError(result.error);
      setSearchResults(result.results);
    });
  }

  return (
    <section className="friends-match">
      <h2>Find friends</h2>
      <p className="friends-muted">
        Ranked by shared books, movies, and albums. Search by name anytime.
      </p>

      {incoming.length > 0 && (
        <div className="friends-block">
          <h3>Requests</h3>
          <ul className="friends-list">
            {incoming.map((candidate) => (
              <CandidateRow key={candidate.profile.id} candidate={candidate} />
            ))}
          </ul>
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="friends-block">
          <h3>Sent</h3>
          <ul className="friends-list">
            {outgoing.map((candidate) => (
              <CandidateRow key={candidate.profile.id} candidate={candidate} />
            ))}
          </ul>
        </div>
      )}

      <div className="friends-block">
        <label className="friends-search">
          <span>Search by name</span>
          <PixelInput
            type="search"
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Type at least 2 letters…"
            autoComplete="off"
          />
        </label>
        {pending && <p className="friends-muted">Searching…</p>}
        {searchError && <p className="friends-error">{searchError}</p>}
        {searchResults && (
          <ul className="friends-list">
            {searchResults.length === 0 ? (
              <li className="friends-muted">No profiles found.</li>
            ) : (
              searchResults.map((candidate) => (
                <CandidateRow
                  key={candidate.profile.id}
                  candidate={candidate}
                />
              ))
            )}
          </ul>
        )}
      </div>

      {!searchResults && (
        <div className="friends-block">
          <h3>Closest matches</h3>
          {matches.length === 0 ? (
            <p className="friends-muted">
              Log more in the Library to unlock better matches — or search by
              name.
            </p>
          ) : (
            <ul className="friends-list">
              {matches.map((candidate) => (
                <CandidateRow
                  key={candidate.profile.id}
                  candidate={candidate}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
