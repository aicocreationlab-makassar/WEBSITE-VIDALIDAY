import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import { Button } from "@/components/ui/button";
import type { SiteChrome } from "@/lib/data/chrome";
import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";
import { ApartmentsDropdown } from "./apartments-dropdown";
import { MobileMenu } from "./mobile-menu";

// Tautan nav desktop: lebih rapat di md (768–1023px) supaya logo, tiga tautan, dan dua tombol muat.
const NAV_LINK =
  "inline-flex h-11 items-center gap-1 rounded-control px-2.5 text-sm font-semibold whitespace-nowrap text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink aria-expanded:bg-surface-2 aria-expanded:text-ink lg:px-3 lg:text-[15px]";

/**
 * Header publik, menempel di atas. Mobile: logo, tombol WhatsApp (ikon saja), tombol menu.
 * Desktop: logo, Cari unit, Apartemen, Tentang kami, satu tombol "Tanya admin" (ikon + teks).
 * Tanpa usePathname, jadi seluruh header ikut ter-prerender.
 */
export function SiteHeader({ chrome }: { chrome: SiteChrome }) {
  const { settings, locations } = chrome;
  const waHref = waLink(settings.whatsappNumber, GENERAL_INQUIRY_MESSAGE);

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-[60px] max-w-[1200px] items-center gap-3 px-4 sm:px-6 md:h-[72px] lg:px-8">
        <Logo logo={settings.siteLogo} size="nav" className="mr-auto md:mr-0" />

        <nav aria-label="Navigasi utama" className="hidden min-w-0 flex-1 items-center md:flex lg:ml-4 lg:gap-1">
          <Link href="/sewa" className={NAV_LINK}>
            Cari unit
          </Link>
          <ApartmentsDropdown locations={locations} triggerClassName={NAV_LINK} />
          <Link href="/about" className={NAV_LINK}>
            Tentang kami
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="md:w-auto md:px-3 md:text-sm lg:px-4 lg:text-[15px]"
          >
            <a href={waHref} target="_blank" rel="noopener noreferrer" data-testid="header-whatsapp">
              <WhatsappIcon className="size-5" />
              <span className="sr-only md:not-sr-only">Tanya admin</span>
            </a>
          </Button>
          <MobileMenu locations={locations} waHref={waHref} />
        </div>
      </div>
    </header>
  );
}
