import { FloatingWhatsapp } from "@/components/public/layout/floating-whatsapp";
import { getSiteChrome } from "@/lib/data/chrome";

/**
 * Halaman dengan tombol WhatsApp mengambang (PRD 6.1): beranda, /sewa, /apartemen/*, /about.
 * Detail unit dan kebijakan privasi sengaja di luar grup ini. Jarak bawah di mobile
 * supaya tombol tidak menutupi isi ada di padding bawah footer.
 */
export default async function WithFabLayout({ children }: LayoutProps<"/">) {
  const { settings } = await getSiteChrome();

  return (
    <>
      {children}
      <FloatingWhatsapp number={settings.whatsappNumber} />
    </>
  );
}
