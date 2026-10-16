"use client";

import { useEffect, useRef, useState } from "react";
import { scrollBehavior } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { SectionStatus } from "./settings-model";

export type NavSection = { id: string; title: string; status?: SectionStatus };

/**
 * Navigasi bagian form yang menempel di bawah topbar (penting di HP: form panjang).
 * Chip aktif mengikuti posisi gulir; titik merah = ada isian yang perlu diperbaiki,
 * titik kuning = ada perubahan yang belum disimpan.
 */
export function SectionNav({ sections, label }: { sections: NavSection[]; label: string }) {
  const [active, setActive] = useState<string | null>(sections[0]?.id ?? null);
  const scroller = useRef<HTMLUListElement>(null);
  const idsKey = sections.map((section) => section.id).join(" ");

  // Bagian yang sedang dibaca: yang pertama terlihat di bawah topbar + nav.
  useEffect(() => {
    const ids = idsKey.split(" ").filter(Boolean);
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (!elements.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = ids.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      { rootMargin: "-140px 0px -45% 0px" },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [idsKey]);

  // Chip aktif selalu terlihat di baris yang bisa digeser (HP).
  useEffect(() => {
    const list = scroller.current;
    const chip = list?.querySelector<HTMLElement>(`[data-section="${active}"]`);
    if (!list || !chip) return;
    const left = chip.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + chip.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = Math.max(0, left - 16);
    }
  }, [active]);

  function jump(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    // Pindahkan fokus keyboard ke bagian tujuan, supaya Tab berikutnya masuk ke isiannya.
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
    setActive(id);
  }

  if (!sections.length) return null;

  return (
    <nav
      aria-label={label}
      className="sticky top-16 z-10 -mx-4 mb-5 border-b border-line bg-white/95 px-4 py-1 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      {/* Padding kecil supaya cincin fokus tidak terpotong oleh area geser. */}
      <ul ref={scroller} className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {sections.map((section) => {
          const current = section.id === active;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                data-section={section.id}
                aria-current={current ? "location" : undefined}
                onClick={(event) => jump(event, section.id)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-brand-500/20",
                  current
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-line bg-white text-ink-2 hover:bg-surface-2 hover:text-ink",
                )}
              >
                {section.title}
                {section.status === "error" ? (
                  <>
                    <span className="size-2 rounded-full bg-danger" aria-hidden="true" />
                    <span className="sr-only">(ada isian yang perlu diperbaiki)</span>
                  </>
                ) : section.status === "dirty" ? (
                  <>
                    <span className="size-2 rounded-full bg-warning" aria-hidden="true" />
                    <span className="sr-only">(ada perubahan)</span>
                  </>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
