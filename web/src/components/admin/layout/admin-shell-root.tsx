"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import {
  getSidebarClosedServerSnapshot,
  getSidebarClosedSnapshot,
  SIDEBAR_INIT_SCRIPT,
  subscribeSidebar,
} from "./sidebar-store";

/** `null` di server dan selama hidrasi; setelah itu nilai dari localStorage. */
export function useSidebarClosed(): boolean | null {
  return useSyncExternalStore<boolean | null>(
    subscribeSidebar,
    getSidebarClosedSnapshot,
    getSidebarClosedServerSnapshot,
  );
}

/**
 * Skrip inline yang hanya berjalan saat HTML dari server diurai (muat penuh).
 * Di klien bertipe text/plain sehingga React tidak membuat skrip yang dieksekusi
 * (pola dari panduan Next "Preventing flash before hydration").
 */
function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Pembungkus panel admin (juga dipakai skeleton). Menyimpan status sidebar desktop di
 * atribut `data-sidebar`, sehingga anak cukup memakai varian
 * `md:group-data-[sidebar=closed]/shell:hidden`.
 */
export function AdminShellRoot({ children, className }: { children: React.ReactNode; className?: string }) {
  const closed = useSidebarClosed();
  return (
    <div
      data-sidebar={closed === null ? undefined : closed ? "closed" : "open"}
      suppressHydrationWarning
      className={cn("group/shell min-h-dvh bg-surface md:flex", className)}
    >
      <InlineScript html={SIDEBAR_INIT_SCRIPT} />
      {children}
    </div>
  );
}
