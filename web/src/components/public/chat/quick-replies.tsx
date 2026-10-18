"use client";

import type { Chip } from "@/lib/chat/respond";

/** Baris chip balasan cepat di atas kotak tulis (gulir mendatar di HP, membungkus di panel desktop 380px). */
export function QuickReplies({ chips, onSend }: { chips: Chip[]; onSend: (text: string) => void }) {
  return (
    <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto px-4 pb-2 md:flex-wrap" role="group" aria-label="Balasan cepat">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => onSend(chip.send)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full border-[1.5px] border-line bg-white px-3.5 text-sm font-semibold whitespace-nowrap text-ink-2 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-3 focus-visible:ring-brand-500/20"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
