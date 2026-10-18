"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { preloadChat } from "@/lib/chat/load";
import { ChatLoading } from "./chat-loading";

// Panel (mesin jawaban, data, sheet) baru diunduh saat tombol disorot/difokus/disentuh atau ditekan.
const ChatPanel = dynamic(() => import("./chat-panel").then((mod) => mod.ChatPanel), {
  ssr: false,
  loading: () => <ChatLoading />,
});

/** Halaman untuk analitik (tanpa slug/parameter). */
function pageKind(pathname: string): string {
  if (pathname === "/") return "home";
  const first = pathname.split("/")[1] ?? "";
  if (first === "sewa") return "sewa";
  if (first === "unit") return "unit";
  if (first === "apartemen") return "apartemen";
  if (first === "about") return "about";
  if (first === "kebijakan-privasi") return "privasi";
  return "other";
}

/**
 * Tombol chat mengambang 56px di kanan bawah (safe area iPhone). Di halaman unit mobile naik di atas
 * bar CTA lewat varian `above-cta` (body:has([data-sticky-cta])). Hanya ini yang ada di muatan awal.
 */
export function ChatLauncher({ waHref }: { waHref: string }) {
  const launcherRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  function toggle() {
    const next = !open;
    setMounted(true);
    setOpen(next);
    if (next) track("chat_open", { page: pageKind(window.location.pathname) });
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        data-testid="chat-launcher"
        // Nama aksesibel memuat label yang terlihat di desktop ("Tanya kami"), WCAG 2.5.3.
        aria-label={open ? "Tutup chat" : "Tanya kami, buka chat bantuan"}
        aria-haspopup="dialog"
        aria-expanded={open}
        onPointerEnter={preloadChat}
        onFocus={preloadChat}
        onTouchStart={preloadChat}
        onClick={toggle}
        className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 inline-flex h-14 min-w-14 items-center justify-center gap-2 rounded-full bg-brand-600 px-4 font-bold text-white shadow-raised transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-offset-4 active:bg-brand-800 above-cta:max-md:bottom-[calc(72px+1rem+env(safe-area-inset-bottom))] md:right-[calc(1.5rem+env(safe-area-inset-right))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <MessageCircle className="size-6" aria-hidden="true" />}
        <span className={open ? "sr-only" : "sr-only md:not-sr-only"}>Tanya kami</span>
      </button>
      {mounted ? <ChatPanel open={open} onOpenChange={setOpen} launcherRef={launcherRef} waHref={waHref} /> : null}
    </>
  );
}
