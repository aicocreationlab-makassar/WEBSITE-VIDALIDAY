"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Teks yang sudah dibersihkan (cleanDescription). */
  text: string;
  /** Tebakan server apakah teks melebihi 4 baris (mencegah tombol muncul belakangan). */
  likelyLong: boolean;
};

/** Deskripsi maks. 4 baris + "Selengkapnya"/"Sembunyikan" (PRD 6.4 no. 7). Baris baru dipertahankan. */
export function UnitDescription({ text, likelyLong }: Props) {
  const id = useId();
  const textRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(likelyLong);

  // Ukur ulang saat tertutup (dan saat lebar berubah) untuk tahu apakah tombol perlu tampil.
  useEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const observer = new ResizeObserver(() => setClamped(el.scrollHeight > el.clientHeight + 1));
    observer.observe(el);
    return () => observer.disconnect();
  }, [expanded]);

  return (
    <div>
      <div
        ref={textRef}
        id={id}
        className={cn("text-base leading-[26px] whitespace-pre-line text-ink-2", !expanded && "line-clamp-4")}
      >
        {text}
      </div>
      {clamped || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-control font-semibold text-brand-700 hover:underline"
        >
          {expanded ? "Sembunyikan" : "Selengkapnya"}
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </div>
  );
}
