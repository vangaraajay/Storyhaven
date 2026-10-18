"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/friends";
import {
  pollChatMessagesAction,
  sendDmAction,
  sendGroupMessageAction,
  type FriendsActionState,
} from "./actions";
import PixelButton from "@/components/pixel/PixelButton";
import PixelInput from "@/components/pixel/PixelInput";

const initial: FriendsActionState = { error: null, message: null };
const POLL_MS = 2500;

type ChatPanelProps =
  | {
      kind: "dm";
      title: string;
      friendshipId: string;
      otherId: string;
      myId: string;
      messages: ChatMessage[];
      initialDraft?: string | null;
    }
  | {
      kind: "group";
      title: string;
      groupId: string;
      myId: string;
      messages: ChatMessage[];
      initialDraft?: string | null;
    };

function threadKey(props: ChatPanelProps): string {
  return props.kind === "dm" ? `dm:${props.friendshipId}` : `group:${props.groupId}`;
}

export default function ChatPanel(props: ChatPanelProps) {
  const action = props.kind === "dm" ? sendDmAction : sendGroupMessageAction;
  const [state, formAction, pending] = useActionState(action, initial);
  const [messages, setMessages] = useState(props.messages);
  const [bodyText, setBodyText] = useState(props.initialDraft ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const key = threadKey(props);
  const lastMessageId = messages[messages.length - 1]?.id ?? "empty";

  // Synchronize incoming messages when thread key or props change
  const [prevKey, setPrevKey] = useState(key);
  const [prevMessages, setPrevMessages] = useState(props.messages);
  if (key !== prevKey || props.messages !== prevMessages) {
    setPrevKey(key);
    setPrevMessages(props.messages);
    setMessages(props.messages);
  }

  // Synchronize draft prop changes
  const [prevDraft, setPrevDraft] = useState(props.initialDraft);
  if (props.initialDraft !== prevDraft) {
    setPrevDraft(props.initialDraft);
    setBodyText(props.initialDraft ?? "");
  }

  // Append newly sent message from form action
  const [lastSentMessage, setLastSentMessage] = useState(state.message);
  if (state.message && state.message !== lastSentMessage) {
    setLastSentMessage(state.message);
    if (!messages.some((m) => m.id === state.message!.id)) {
      setMessages([...messages, state.message]);
    }
    setBodyText("");
  }

  const friendshipId = props.kind === "dm" ? props.friendshipId : null;
  const groupId = props.kind === "group" ? props.groupId : null;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const result = await pollChatMessagesAction(
        friendshipId
          ? { kind: "dm", friendshipId }
          : { kind: "group", groupId: groupId! },
      );
      if (cancelled || result.error) return;
      setMessages(result.messages);
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [key, friendshipId, groupId]);

  // Keep the thread pinned to the newest messages (bottom), not the top.
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const pin = () => {
      thread.scrollTop = thread.scrollHeight;
    };
    pin();
    requestAnimationFrame(pin);
  }, [key, lastMessageId, messages.length]);

  return (
    <section className="friends-chat px-panel">
      <header className="friends-chat-header">
        <h2>{props.title}</h2>
      </header>

      <div ref={threadRef} className="friends-chat-thread">
        {messages.length === 0 ? (
          <p className="friends-muted">No messages yet. Say hello.</p>
        ) : (
          messages.map((message) => {
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

      <form ref={formRef} action={formAction} className="friends-chat-compose">
        {props.kind === "dm" ? (
          <>
            <input type="hidden" name="friendshipId" value={props.friendshipId} />
            <input type="hidden" name="otherId" value={props.otherId} />
          </>
        ) : (
          <input type="hidden" name="groupId" value={props.groupId} />
        )}
        <PixelInput
          name="body"
          type="text"
          placeholder="Write a message…"
          value={bodyText}
          onChange={(e) => setBodyText(e.target.value)}
          required
          maxLength={4000}
          autoComplete="off"
        />
        <PixelButton type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </PixelButton>
      </form>
      {state.error && <p className="friends-error">{state.error}</p>}
    </section>
  );
}
