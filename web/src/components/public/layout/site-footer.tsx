import type { ReactNode } from "react";
import Link from "next/link";
import { Clock, Mail, Phone, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { WhatsappIcon } from "@/components/icons/whatsapp";
import type { SiteChrome } from "@/lib/data/chrome";
import { formatOfficeHours, formatWhatsappDisplay, normalizeWhatsapp, toDisplayLegalName } from "@/lib/format";
import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";

// Tinggi 44px di mobile (target sentuh), lebih rapat di desktop.
const FOOTER_LINK =
  "inline-flex min-h-11 max-w-full items-center rounded-control text-[15px] font-medium text-white underline-offset-4 transition-colors duration-150 hover:text-white/80 hover:underline md:min-h-9";

function FooterColumn({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <nav aria-labelledby={id} className="min-w-0">
      <h2 id={id} className="text-sm font-bold text-white">
        {title}
      </h2>
      <ul className="mt-2 flex flex-col md:mt-3">{children}</ul>
    </nav>
  );
}

/** Footer publik: latar gelap night ke night-rose, teks putih 80%, tautan putih. */
export function SiteFooter({ chrome, year }: { chrome: SiteChrome; year: number }) {
  const { settings, locations } = chrome;
  const waHref = waLink(settings.whatsappNumber, GENERAL_INQUIRY_MESSAGE);
  const officeHours = formatOfficeHours(settings.officeHours);
  const email = settings.contactEmail.trim();
  const phone = settings.contactPhone.trim();
  const phoneHref = phone.replace(/[^\d+]/g, "");
  // Telepon yang sama dengan nomor WhatsApp tidak ditampilkan dua kali.
  const showPhone = Boolean(phone && phoneHref) && normalizeWhatsapp(phone) !== normalizeWhatsapp(settings.whatsappNumber);

  return (
    <footer data-testid="site-footer" className="bg-linear-to-br from-night to-night-rose text-white/80">
      {/* Padding bawah mobile ekstra: tombol WA mengambang / bar CTA menempel tidak menutupi hak cipta. */}
      <div className="mx-auto max-w-[1200px] px-4 pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pt-16 md:pb-10 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.25fr)]">
          <div className="min-w-0 md:col-span-3 lg:col-span-1">
            <Logo logo={settings.siteLogo} href={null} variant="inverse" eager={false} />
            <p className="mt-4 max-w-sm text-[15px] leading-6">
              Sewa apartemen harian, mingguan, dan bulanan di Makassar, dikelola resmi.
            </p>
            {settings.companyLegalName.trim() ? (
              <p className="mt-4 flex max-w-sm items-start gap-2 text-sm leading-5">
                <ShieldCheck className="mt-px size-4 shrink-0 text-white/70" aria-hidden="true" />
                <span>
                  Dikelola oleh{" "}
                  <span className="font-semibold text-white">{toDisplayLegalName(settings.companyLegalName)}</span>
                </span>
              </p>
            ) : null}
          </div>

          <FooterColumn id="footer-apartemen" title="Apartemen">
            {locations.map((location) => (
              <li key={location.slug} className="min-w-0">
                <Link href={`/apartemen/${location.slug}`} className={FOOTER_LINK}>
                  <span className="truncate">{location.name}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/sewa" className={FOOTER_LINK}>
                Semua unit
              </Link>
            </li>
          </FooterColumn>

          <FooterColumn id="footer-bantuan" title="Bantuan">
            <li>
              <Link href="/about" className={FOOTER_LINK}>
                Tentang kami
              </Link>
            </li>
            <li>
              <Link href="/#faq" className={FOOTER_LINK}>
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/kebijakan-privasi" className={FOOTER_LINK}>
                Kebijakan privasi
              </Link>
            </li>
          </FooterColumn>

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">Kontak</h2>
            <ul className="mt-3 flex flex-col gap-3">
              <li>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-11 items-center gap-3 rounded-control"
                >
                  <WhatsappIcon className="size-5 shrink-0 text-white/70" />
                  <span className="flex flex-col">
                    <span className="text-caption text-white/70">WhatsApp</span>
                    <span className="text-[15px] font-semibold text-white tabular-nums underline-offset-4 group-hover:underline">
                      {formatWhatsappDisplay(settings.whatsappNumber)}
                    </span>
                  </span>
                </a>
              </li>
              {showPhone ? (
                <li>
                  <a href={`tel:${phoneHref}`} className="group inline-flex min-h-11 items-center gap-3 rounded-control">
                    <Phone className="size-5 shrink-0 text-white/70" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-caption text-white/70">Telepon</span>
                      <span className="text-[15px] font-semibold text-white tabular-nums underline-offset-4 group-hover:underline">
                        {phone}
                      </span>
                    </span>
                  </a>
                </li>
              ) : null}
              {officeHours ? (
                <li className="flex min-h-11 items-center gap-3">
                  <Clock className="size-5 shrink-0 text-white/70" aria-hidden="true" />
                  <span className="flex flex-col">
                    <span className="text-caption text-white/70">Jam layanan</span>
                    <span className="text-[15px] font-semibold text-white">{officeHours}</span>
                  </span>
                </li>
              ) : null}
              {email ? (
                <li className="min-w-0">
                  <a
                    href={`mailto:${email}`}
                    className="group inline-flex min-h-11 max-w-full items-center gap-3 rounded-control"
                  >
                    <Mail className="size-5 shrink-0 text-white/70" aria-hidden="true" />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-caption text-white/70">Email</span>
                      <span className="text-[15px] font-semibold [overflow-wrap:anywhere] text-white underline-offset-4 group-hover:underline">
                        {email}
                      </span>
                    </span>
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 md:mt-12">
          <p className="text-caption text-white/70">© {year} VIDALIDAY. Seluruh hak cipta dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
