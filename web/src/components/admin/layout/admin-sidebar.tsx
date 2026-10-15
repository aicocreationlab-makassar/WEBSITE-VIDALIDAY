"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import { ExternalLink, LoaderCircle, LogOut } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { signOut } from "@/lib/actions/admin/auth";
import { cn } from "@/lib/utils";
import { ADMIN_HOME, ADMIN_NAV, formatBadgeCount, isNavItemActive } from "./admin-nav";

// Item menu (DESIGN 5): tinggi 44px, radius 12, ikon 20px.
const itemBase =
  "group/item flex h-11 w-full items-center gap-3 rounded-control border px-3 text-left text-sm font-semibold transition-colors";
const itemIdle = "border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink";
const iconIdle = "size-5 shrink-0 text-subtle transition-colors group-hover/item:text-ink-2";

type AdminSidebarContentProps = {
  pathname: string;
  newLeads: number;
  /** Dipanggil saat tautan diklik (menutup drawer mobile). */
  onNavigate?: () => void;
  /** Di dalam Sheet: beri ruang untuk tombol tutup di kanan atas. */
  inSheet?: boolean;
};

export function AdminSidebarContent({ pathname, newLeads, onNavigate, inSheet = false }: AdminSidebarContentProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className={cn("flex h-16 shrink-0 items-center border-b border-line px-4", inSheet && "pr-14")}>
        <Logo size="sm" tone="admin" href={ADMIN_HOME} />
      </div>

      <nav aria-label="Menu admin" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
        <ul className="space-y-1">
          {ADMIN_NAV.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    itemBase,
                    active ? "border-brand-200 bg-brand-50 font-bold text-brand-700" : itemIdle,
                  )}
                >
                  <Icon className={active ? "size-5 shrink-0 text-brand-600" : iconIdle} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.showLeadsBadge && newLeads > 0 ? (
                    <span
                      data-testid="badge-leads"
                      role="img"
                      aria-label={`${newLeads} permintaan baru`}
                      className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white tabular-nums"
                    >
                      {formatBadgeCount(newLeads)}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 space-y-1 border-t border-line p-3">
        <Link href="/" target="_blank" rel="noopener" onClick={onNavigate} className={cn(itemBase, itemIdle)}>
          <ExternalLink className={iconIdle} aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">Lihat situs</span>
        </Link>
        <form action={signOut}>
          <SignOutButton />
        </form>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        itemBase,
        "border-transparent text-ink-2 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-wait disabled:opacity-70",
      )}
    >
      {pending ? (
        <LoaderCircle className="size-5 shrink-0 animate-spin text-subtle" aria-hidden="true" />
      ) : (
        <LogOut
          className="size-5 shrink-0 text-subtle transition-colors group-hover/item:text-brand-600"
          aria-hidden="true"
        />
      )}
      <span className="min-w-0 flex-1 truncate">Keluar</span>
    </button>
  );
}
