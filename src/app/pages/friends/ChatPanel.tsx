"use client";

import { useActionState } from "react";
import type { ChatMessage } from "@/lib/friends";
import {
  sendDmAction,
  sendGroupMessageAction,
  type FriendsActionState,
} from "./actions";

const initial: FriendsActionState = { error: null };

type ChatPanelProps =
  | {
      kind: "dm";
      title: string;
      friendshipId: string;
      otherId: string;
      myId: string;
      messages: ChatMessage[];
    }
  | {
      kind: "group";
      title: string;
      groupId: string;
      myId: string;
      messages: ChatMessage[];
    };

export default function ChatPanel(props: ChatPanelProps) {
  const action = props.kind === "dm" ? sendDmAction : sendGroupMessageAction;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <section className="friends-chat">
      <header className="friends-chat-header">
        <h2>{props.title}</h2>
      </header>

      <div className="friends-chat-thread">
        {props.messages.length === 0 ? (
          <p className="friends-muted">No messages yet. Say hello.</p>
        ) : (
          props.messages.map((message) => {
            const mine = message.sender_id === props.myId;
            return (
              <div
                key={message.id}
                className={`friends-bubble ${mine ? "mine" : "theirs"}`}
              >
                {!mine && (
                  <p className="friends-bubble-name">
                    {message.sender?.display_name ?? "Someone"}
                  </p>
                )}
                <p>{message.body}</p>
              </div>
            );
          })
        )}
      </div>

      <form action={formAction} className="friends-chat-compose">
        {props.kind === "dm" ? (
          <>
            <input type="hidden" name="friendshipId" value={props.friendshipId} />
            <input type="hidden" name="otherId" value={props.otherId} />
          </>
        ) : (
          <input type="hidden" name="groupId" value={props.groupId} />
        )}
        <input
          name="body"
          type="text"
          placeholder="Write a message…"
          required
          maxLength={4000}
          autoComplete="off"
        />
        <button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
      {state.error && <p className="friends-error">{state.error}</p>}
    </section>
  );
}
