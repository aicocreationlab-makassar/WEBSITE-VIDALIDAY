"use client";

import Link from "next/link";
import { Building2, CircleHelp, Info, Menu, Search, type LucideIcon } from "lucide-react";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { NavLocation } from "@/lib/data/chrome";

type MobileMenuProps = {
  locations: NavLocation[];
  /** Tautan wa.me dengan pesan umum. */
  waHref: string;
};

const ROW =
  "flex min-h-13 items-center gap-3 rounded-control px-3 text-base font-semibold text-ink transition-colors duration-150 hover:bg-surface-2 active:bg-surface-2";

function MenuRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <li>
      <SheetClose asChild>
        <Link href={href} className={ROW}>
          <Icon className="size-5 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 truncate">{label}</span>
        </Link>
      </SheetClose>
    </li>
  );
}

/** Menu mobile (di bawah `md`): sheet dari kanan dengan baris 52px dan tombol WhatsApp di bawah. */
export function MobileMenu({ locations, waHref }: MobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="quiet" size="icon" aria-label="Buka menu" className="md:hidden">
          <Menu className="size-6" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" closeLabel="Tutup menu" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-2">
          <nav aria-label="Menu situs">
            <ul className="flex flex-col gap-0.5">
              <MenuRow href="/sewa" icon={Search} label="Cari unit" />
            </ul>
            {locations.length > 0 ? (
              <div className="mt-3 border-t border-line pt-3">
                <p id="menu-apartemen" className="px-3 pb-1 text-caption font-semibold text-muted">
                  Apartemen
                </p>
                <ul aria-labelledby="menu-apartemen" className="flex flex-col gap-0.5">
                  {locations.map((location) => (
                    <MenuRow
                      key={location.slug}
                      href={`/apartemen/${location.slug}`}
                      icon={Building2}
                      label={location.shortName}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            <ul className="mt-3 flex flex-col gap-0.5 border-t border-line pt-3">
              <MenuRow href="/about" icon={Info} label="Tentang kami" />
              <MenuRow href="/#faq" icon={CircleHelp} label="FAQ" />
            </ul>
          </nav>
        </SheetBody>
        <SheetFooter className="pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <Button asChild size="lg" className="w-full">
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <WhatsappIcon className="size-5" />
              Chat admin via WhatsApp
            </a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
