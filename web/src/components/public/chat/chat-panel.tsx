"use client";

import { lazy, Suspense, useEffect, useRef, type RefObject } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { BOT_NAME } from "@/lib/chat/respond";
import { ChatBody } from "./chat-body";
import { ChatLoading } from "./chat-loading";

// Sheet (Radix Dialog) hanya untuk mobile; desktop memakai kartu tetap tanpa Radix.
const ChatSheet = lazy(() => import("./chat-sheet").then((mod) => ({ default: mod.ChatSheet })));

export type ChatPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  launcherRef: RefObject<HTMLButtonElement | null>;
  waHref: string;
};

/**
 * Panel chat: bottom sheet 92dvh di bawah md (modal, fokus terkunci, Esc), kartu 380x600 di kanan bawah
 * di desktop (non-modal: halaman tetap bisa digulir sambil chat; Esc menutup dan fokus kembali ke tombol).
 */
export function ChatPanel(props: ChatPanelProps) {
  const isDesktop = useIsDesktop();
  if (!isDesktop) {
    return (
      <Suspense fallback={props.open ? <ChatLoading /> : null}>
        <ChatSheet {...props} />
      </Suspense>
    );
  }
  return <ChatDock {...props} />;
}

function ChatDock({ open, onOpenChange, launcherRef, waHref }: ChatPanelProps) {
  const dockRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);

  // Buka: fokus masuk ke panel (kotak tulis menyusul saat data siap), supaya Enter berikutnya tidak
  // mengenai tombol pembuka. Tutup: fokus kembali ke tombol (bukan saat pertama dipasang tertutup).
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      dockRef.current?.focus({ preventScroll: true });
    } else if (wasOpen.current) {
      launcherRef.current?.focus({ preventScroll: true });
    }
  }, [open, launcherRef]);

  if (!open) return null;
  return (
    <div
      ref={dockRef}
      role="dialog"
      aria-modal="false"
      aria-label={`Chat dengan ${BOT_NAME}`}
      data-testid="chat-panel"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onOpenChange(false);
        }
      }}
      className="fixed right-6 bottom-24 z-50 flex h-[min(600px,calc(100dvh-8rem))] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-sheet bg-white text-ink shadow-raised ring-1 ring-line outline-none"
    >
      <ChatBody waHref={waHref} onClose={() => onOpenChange(false)} autoFocusInput />
    </div>
  );
}
