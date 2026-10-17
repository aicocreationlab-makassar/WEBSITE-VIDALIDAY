"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, SendHorizontal, X } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
import { createState, greet, respond, type ChatState } from "@/lib/chat/engine";
import { loadKnowledge } from "@/lib/chat/load";
import { BOT_NAME, type BotReply } from "@/lib/chat/respond";
import { clearSession, readSession, writeSession, type StoredMessage } from "@/lib/chat/session";
import { indexKnowledge, type ChatKnowledge, type KnowledgeIndex } from "@/lib/chat/types";
import { ChatMessages } from "./chat-messages";
import { QuickReplies } from "./quick-replies";

type Props = {
  waHref: string;
  onClose: () => void;
  /** Tautan di dalam chat diklik (mobile: tutup sheet). */
  onNavigate?: () => void;
  autoFocusInput?: boolean;
};

const MAX_INPUT = 300;
const THINK_MIN_MS = 250;
const THINK_MAX_MS = 900;
const THINK_REDUCED_MS = 120;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function thinkDelay(text: string): number {
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return THINK_REDUCED_MS;
  return Math.min(THINK_MAX_MS, THINK_MIN_MS + 12 * text.length);
}

/**
 * Isi panel chat: header, riwayat pesan, chip balasan cepat, dan kotak tulis. Data diambil dari
 * /chat-data saat pertama dibuka; jawaban dihitung di browser dengan jeda "berpikir" singkat.
 * Riwayat tersimpan di sessionStorage perangkat ini (maks. 30 pesan, 24 jam).
 */
export function ChatBody({ waHref, onClose, onNavigate, autoFocusInput = false }: Props) {
  const inputId = useId();
  const [knowledge, setKnowledge] = useState<ChatKnowledge | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState("");
  const stateRef = useRef<ChatState>(createState());
  const timerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idx = useMemo<KnowledgeIndex | null>(() => (knowledge ? indexKnowledge(knowledge) : null), [knowledge]);

  // Muat data, lalu lanjutkan riwayat sesi atau mulai dengan sapaan.
  useEffect(() => {
    let active = true;
    loadKnowledge()
      .then((data) => {
        if (!active) return;
        const index = indexKnowledge(data);
        const stored = readSession();
        if (stored && stored.messages.length) {
          stateRef.current = stored.state;
          setMessages(stored.messages);
        } else {
          stateRef.current = createState();
          setMessages([{ id: newId(), role: "bot", reply: greet(data, index), at: Date.now() }]);
        }
        setKnowledge(data);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (messages.length) writeSession(messages, stateRef.current);
  }, [messages]);

  useEffect(() => {
    if (autoFocusInput && knowledge) inputRef.current?.focus({ preventScroll: true });
  }, [autoFocusInput, knowledge]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.replace(/\s+/g, " ").trim().slice(0, MAX_INPUT);
      if (!text || !knowledge || !idx || thinking) return;
      const turn = respond(text, stateRef.current, knowledge, idx);
      setMessages((current) => [...current, { id: newId(), role: "user", text, at: Date.now() }]);
      setDraft("");
      setThinking(true);
      track("chat_question", {
        intent: turn.analysis.intent,
        matched: turn.analysis.matched,
        lokasi: turn.state.slots.apartment,
      });
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        stateRef.current = turn.state;
        setMessages((current) => [...current, { id: newId(), role: "bot", reply: turn.reply, at: Date.now() }]);
        setThinking(false);
      }, thinkDelay(text));
    },
    [knowledge, idx, thinking],
  );

  function restart() {
    if (!knowledge || !idx) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    clearSession();
    stateRef.current = createState();
    setThinking(false);
    setMessages([{ id: newId(), role: "bot", reply: greet(knowledge, idx), at: Date.now() }]);
    inputRef.current?.focus({ preventScroll: true });
  }

  const lastReply: BotReply | null = (() => {
    const last = messages[messages.length - 1];
    return last && last.role === "bot" ? last.reply : null;
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-base font-extrabold text-brand-700"
        >
          V
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base leading-5 font-bold text-ink">{BOT_NAME}</p>
          <p className="truncate text-caption text-muted">Jawaban dari data unit di situs ini</p>
        </div>
        <Button type="button" variant="quiet" size="icon" aria-label="Mulai ulang percakapan" onClick={restart} disabled={!knowledge}>
          <RotateCcw className="size-5" aria-hidden="true" />
        </Button>
        <Button type="button" variant="quiet" size="icon" aria-label="Tutup chat" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </header>

      {loadFailed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm text-ink-2">Data unit belum bisa dimuat. Coba lagi, atau tanya admin langsung lewat WhatsApp.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setLoadFailed(false);
                setAttempt((n) => n + 1);
              }}
            >
              Coba lagi
            </Button>
            <Button asChild>
              <a href={waHref} target="_blank" rel="noopener noreferrer">
                <WhatsappIcon className="size-5" />
                Tanya admin via WhatsApp
              </a>
            </Button>
          </div>
        </div>
      ) : !knowledge || !idx ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted" role="status">
          <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          Menyiapkan data unit
        </div>
      ) : (
        <>
          <ChatMessages messages={messages} thinking={thinking} knowledge={knowledge} idx={idx} onNavigate={onNavigate} />
          {lastReply && lastReply.chips.length && !thinking ? <QuickReplies chips={lastReply.chips} onSend={send} /> : null}
        </>
      )}

      <form
        className="flex shrink-0 items-center gap-2 border-t border-line bg-white px-3 py-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Tulis pertanyaan
        </label>
        <Input
          ref={inputRef}
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Tulis pertanyaan, mis. harga studio"
          maxLength={MAX_INPUT}
          autoComplete="off"
          enterKeyHint="send"
          disabled={!knowledge || loadFailed}
          className="h-11 flex-1 text-[15px]"
        />
        <Button type="submit" size="icon" aria-label="Kirim" disabled={!knowledge || thinking || !draft.trim()}>
          <SendHorizontal className="size-5" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
