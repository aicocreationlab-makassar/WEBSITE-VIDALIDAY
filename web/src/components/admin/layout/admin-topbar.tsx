"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ChevronDown, CircleUser, ExternalLink, LoaderCircle, LogOut, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/actions/admin/auth";

type AdminTopbarProps = {
  title: string;
  email: string | null;
  sidebarExpanded: boolean;
  sidebarId?: string;
  onToggleSidebar: () => void;
  toggleRef?: React.Ref<HTMLButtonElement>;
};

/** Topbar 64px (DESIGN 5): tombol menu, judul halaman, "Lihat situs", menu akun. */
export function AdminTopbar({
  title,
  email,
  sidebarExpanded,
  sidebarId,
  onToggleSidebar,
  toggleRef,
}: AdminTopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-3 sm:px-6">
      <Button
        ref={toggleRef}
        type="button"
        variant="secondary"
        size="icon"
        aria-label="Buka atau tutup menu"
        aria-expanded={sidebarExpanded}
        aria-controls={sidebarId}
        onClick={onToggleSidebar}
      >
        <PanelLeft aria-hidden="true" />
      </Button>

      <h1 className="min-w-0 flex-1 truncate text-lg leading-7 font-bold text-ink">{title}</h1>

      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="secondary" className="max-sm:w-11 max-sm:px-0">
          <Link href="/" target="_blank" rel="noopener" aria-label="Lihat situs">
            <ExternalLink aria-hidden="true" />
            <span className="hidden sm:inline">Lihat situs</span>
          </Link>
        </Button>
        <AccountMenu email={email} />
      </div>
    </header>
  );
}

function AccountMenu({ email }: { email: string | null }) {
  const [signingOut, startSignOut] = useTransition();
  const displayEmail = email ?? "Akun admin";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="quiet" aria-label={`${displayEmail}, menu akun`} className="max-sm:w-11 max-sm:px-0">
          {signingOut ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <CircleUser aria-hidden="true" />
          )}
          <span className="hidden max-w-48 truncate text-sm sm:inline">{displayEmail}</span>
          <ChevronDown className="hidden size-4 text-muted sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-64 rounded-control p-1.5 shadow-raised">
        <DropdownMenuLabel className="px-2.5 py-2">
          <span className="block text-caption font-medium text-muted">Masuk sebagai</span>
          <span className="block truncate text-sm font-semibold text-ink">{displayEmail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem
          disabled={signingOut}
          onSelect={() => {
            // Dipanggil langsung (bukan lewat <form> di dalam menu) supaya tidak batal
            // ketika isi menu dilepas dari DOM saat menu tertutup.
            startSignOut(async () => {
              await signOut();
            });
          }}
          className="min-h-11 gap-2.5 rounded-[10px] px-2.5 text-[15px] font-semibold text-ink-2 focus:bg-brand-50 focus:text-brand-700 not-data-[variant=destructive]:focus:**:text-brand-700"
        >
          <LogOut className="size-5" aria-hidden="true" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
