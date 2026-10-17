"use client";

import { useEffect, useRef } from "react";
import type { StoredMessage } from "@/lib/chat/session";
import type { ChatKnowledge, KnowledgeIndex } from "@/lib/chat/types";
import { scrollBehavior } from "@/lib/motion";
import { ChatBubble } from "./chat-bubble";
import { TypingIndicator } from "./typing-indicator";

type Props = {
  messages: StoredMessage[];
  thinking: boolean;
  knowledge: ChatKnowledge;
  idx: KnowledgeIndex;
  onNavigate?: () => void;
};

/** Daftar gelembung chat (live region) yang selalu menggulir ke pesan terbaru. */
export function ChatMessages({ messages, thinking, knowledge, idx, onNavigate }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: scrollBehavior() });
  }, [messages.length, thinking]);

  return (
    <div
      ref={listRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Percakapan"
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-3"
    >
      {messages.map((message, index) => (
        <ChatBubble
          key={message.id}
          message={message}
          knowledge={knowledge}
          idx={idx}
          onNavigate={onNavigate}
          isLatest={index === messages.length - 1}
        />
      ))}
      {thinking ? <TypingIndicator /> : null}
    </div>
  );
}
