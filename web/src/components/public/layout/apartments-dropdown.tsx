"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";
import type { NavLocation } from "@/lib/data/chrome";
import { cn } from "@/lib/utils";

/** Jeda sebelum menu tertutup setelah mouse keluar, supaya pindah dari tombol ke daftar tidak menutupnya. */
const CLOSE_DELAY_MS = 150;

/**
 * Menu "Apartemen" di header desktop: satu tautan per apartemen aktif (pola menu button APG).
 * Mouse: terbuka begitu tombol disorot (tanpa klik), tertutup 150 ms setelah mouse meninggalkan
 * tombol dan daftar; klik mouse pada tombol yang sudah terbuka tidak menutupnya. Sentuh: ketuk
 * membuka/menutup. Keyboard: Enter/Spasi/panah membuka dan memfokus item, panah berpindah,
 * Esc menutup dan mengembalikan fokus ke tombol, Tab keluar menutup. Klik di luar menutup.
 * Tanpa Radix supaya header tidak ikut membundel DropdownMenu + floating-ui.
 */
export function ApartmentsDropdown({
  locations,
  triggerClassName,
}: {
  locations: NavLocation[];
  /** Kelas tautan nav header, supaya pemicu sejajar dengan tautan lain. */
  triggerClassName?: string;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const lastPointer = useRef<string>("");
  const [open, setOpen] = useState(false);

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      // Keyboard sedang di dalam daftar: jangan tutup karena mouse pergi (fokus akan jatuh ke <body>).
      if (panelRef.current?.contains(document.activeElement)) return;
      setOpen(false);
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const close = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  // Klik atau ketukan di luar menu menutupnya; Esc menutupnya di mana pun fokus berada (konten yang
  // muncul karena disorot harus bisa ditutup tanpa memindah mouse, WCAG 1.4.13).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const inside = rootRef.current?.contains(document.activeElement) ?? false;
      cancelClose();
      setOpen(false);
      if (inside) triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, cancelClose]);

  if (locations.length === 0) return null;

  function menuItems(): HTMLAnchorElement[] {
    return Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []);
  }

  function focusItem(index: number) {
    const items = menuItems();
    if (items.length === 0) return;
    items[((index % items.length) + items.length) % items.length].focus();
  }

  function openAndFocus(index: number) {
    cancelClose();
    // Panel harus sudah terpasang sebelum item bisa difokus.
    flushSync(() => setOpen(true));
    focusItem(index);
  }

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        event.preventDefault();
        openAndFocus(0);
        break;
      case "ArrowUp":
        event.preventDefault();
        openAndFocus(-1);
        break;
      case "Escape":
        if (open) close();
        break;
    }
  }

  function onPanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = menuItems();
    const current = items.indexOf(document.activeElement as HTMLAnchorElement);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusItem(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusItem(0);
        break;
      case "End":
        event.preventDefault();
        focusItem(-1);
        break;
      case "Escape":
        event.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case "Tab":
        close();
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onPointerEnter={(event) => {
        if (event.pointerType !== "mouse") return;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") scheduleClose();
      }}
      onBlur={(event) => {
        if (!(event.relatedTarget instanceof Node) || !rootRef.current?.contains(event.relatedTarget)) close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        data-state={open ? "open" : "closed"}
        className={cn("group", triggerClassName)}
        onPointerDown={(event) => {
          lastPointer.current = event.pointerType;
        }}
        onClick={() => {
          cancelClose();
          // Mouse: sorotan yang membuka; klik pada tombol yang terbuka tidak menutupnya.
          if (open && lastPointer.current === "mouse") return;
          setOpen((current) => !current);
        }}
        onKeyDown={onTriggerKeyDown}
      >
        Apartemen
        <ChevronDown
          className="size-4 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label="Apartemen"
          onKeyDown={onPanelKeyDown}
          className="absolute top-full left-0 z-50 mt-2 w-max max-w-80 min-w-60 origin-top-left animate-in rounded-card bg-white p-1.5 shadow-raised ring-1 ring-line duration-100 fade-in-0 zoom-in-95 motion-reduce:animate-none"
        >
          {locations.map((location) => (
            <Link
              key={location.slug}
              role="menuitem"
              tabIndex={-1}
              href={`/apartemen/${location.slug}`}
              onClick={close}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-[15px] font-semibold text-ink outline-none hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <Building2 className="size-5 shrink-0 text-muted" aria-hidden="true" />
              <span className="min-w-0 truncate">{location.name}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
