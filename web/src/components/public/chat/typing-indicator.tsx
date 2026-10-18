import { BOT_NAME } from "@/lib/chat/respond";

/** Gelembung "sedang mengetik": tiga titik memantul (statis saat gerak dikurangi). */
export function TypingIndicator() {
  return (
    <div className="self-start" data-testid="chat-typing">
      <div aria-hidden="true" className="flex items-center gap-1 rounded-card rounded-bl-md bg-surface-2 px-4 py-3.5">
        <span className="size-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s] motion-reduce:animate-none" />
        <span className="size-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s] motion-reduce:animate-none" />
        <span className="size-2 animate-bounce rounded-full bg-muted motion-reduce:animate-none" />
      </div>
      <span className="sr-only">{BOT_NAME} sedang mengetik</span>
    </div>
  );
}
