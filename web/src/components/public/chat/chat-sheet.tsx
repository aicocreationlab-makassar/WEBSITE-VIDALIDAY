"use client";

import { focusSheetContainer, Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { BOT_NAME } from "@/lib/chat/respond";
import { ChatBody } from "./chat-body";
import type { ChatPanelProps } from "./chat-panel";

/** Panel chat mobile: bottom sheet 92dvh; judul visual ada di header ChatBody, judul Radix untuk pembaca layar. */
export function ChatSheet({ open, onOpenChange, launcherRef, waHref }: ChatPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] max-h-[92dvh]"
        showCloseButton={false}
        onOpenAutoFocus={focusSheetContainer}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          launcherRef.current?.focus({ preventScroll: true });
        }}
      >
        <SheetTitle className="sr-only">{BOT_NAME}</SheetTitle>
        <SheetDescription className="sr-only">Jawaban diambil dari data unit yang ada di situs.</SheetDescription>
        <ChatBody waHref={waHref} onClose={() => onOpenChange(false)} onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
