"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getAdminPageTitle } from "./admin-nav";
import { AdminShellRoot, useSidebarClosed } from "./admin-shell-root";
import { AdminSidebarContent } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import {
  DESKTOP_QUERY,
  getDesktopServerSnapshot,
  getDesktopSnapshot,
  getSidebarClosedSnapshot,
  setSidebarClosed,
  subscribeDesktop,
} from "./sidebar-store";

type AdminShellProps = {
  email: string | null;
  newLeads: number;
  children: React.ReactNode;
};

/**
 * Kerangka panel admin (PRD 7.2, DESIGN 5).
 * Desktop: sidebar 256px menempel, bisa ditutup penuh (diingat di localStorage).
 * Mobile: sidebar jadi drawer kiri (Sheet) dengan overlay.
 * Wajib dirender di dalam <Suspense> (memakai usePathname).
 */
export function AdminShell({ email, newLeads, children }: AdminShellProps) {
  const pathname = usePathname();
  const sidebarClosed = useSidebarClosed();
  const isDesktop = useSyncExternalStore<boolean | null>(
    subscribeDesktop,
    getDesktopSnapshot,
    getDesktopServerSnapshot,
  );
  // Drawer terbuka hanya untuk pathname saat dibuka, jadi otomatis tertutup setelah pindah halaman.
  const [sheetPath, setSheetPath] = useState<string | null>(null);
  const sheetOpen = isDesktop === false && sheetPath === pathname;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const sidebarId = useId();

  function toggleSidebar() {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setSheetPath(null);
      setSidebarClosed(!getSidebarClosedSnapshot());
    } else {
      setSheetPath(sheetOpen ? null : pathname);
    }
  }

  const expanded = isDesktop === false ? sheetOpen : sidebarClosed !== true;

  return (
    <AdminShellRoot>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-control focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-raised"
      >
        Langsung ke konten
      </a>

      <aside
        id={sidebarId}
        className="sticky top-0 z-20 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-white md:flex md:group-data-[sidebar=closed]/shell:hidden"
      >
        {/* Di mobile isi sidebar hanya ada di drawer, supaya menu tidak ganda di DOM. */}
        {isDesktop !== false ? <AdminSidebarContent pathname={pathname} newLeads={newLeads} /> : null}
      </aside>

      <Sheet open={sheetOpen} onOpenChange={(open) => setSheetPath(open ? pathname : null)}>
        <SheetContent
          side="left"
          closeLabel="Tutup menu"
          aria-describedby={undefined}
          className="data-[side=left]:w-[min(85vw,18rem)]"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            toggleRef.current?.focus();
          }}
        >
          <SheetTitle className="sr-only">Menu admin</SheetTitle>
          <AdminSidebarContent
            pathname={pathname}
            newLeads={newLeads}
            onNavigate={() => setSheetPath(null)}
            inSheet
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          title={getAdminPageTitle(pathname)}
          email={email}
          sidebarExpanded={expanded}
          sidebarId={isDesktop === false ? undefined : sidebarId}
          onToggleSidebar={toggleSidebar}
          toggleRef={toggleRef}
        />
        <main id="konten" tabIndex={-1} className="min-w-0 flex-1 p-4 outline-none sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </AdminShellRoot>
  );
}
