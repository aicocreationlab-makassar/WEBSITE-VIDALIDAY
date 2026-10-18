import { ChatWidget } from "@/components/public/chat/chat-widget";
import { AnnouncementBar } from "@/components/public/layout/announcement-bar";
import { SiteFooter } from "@/components/public/layout/site-footer";
import { SiteHeader } from "@/components/public/layout/site-header";
import { getCopyrightYear, getSiteChrome } from "@/lib/data/chrome";

/**
 * Bingkai situs publik: tautan lompat, pengumuman, header, konten, footer, dan gelembung chat
 * "Asisten VIDALIDAY" di semua halaman (PRD 6.11). Layout ini bertahan antar navigasi, jadi panel
 * chat desktop tetap terbuka saat tamu berpindah halaman.
 */
export default async function PublicLayout({ children }: LayoutProps<"/">) {
  const [chrome, year] = await Promise.all([getSiteChrome(), getCopyrightYear()]);

  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-60 focus:rounded-control focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-ink focus:shadow-raised"
      >
        Langsung ke konten
      </a>
      <AnnouncementBar text={chrome.settings.promoBannerText} />
      <SiteHeader chrome={chrome} />
      <main
        id="konten"
        tabIndex={-1}
        className="min-h-[60dvh] scroll-mt-[60px] focus:outline-none md:scroll-mt-[72px]"
      >
        {children}
      </main>
      <SiteFooter chrome={chrome} year={year} />
      <ChatWidget settings={chrome.settings} />
    </>
  );
}
