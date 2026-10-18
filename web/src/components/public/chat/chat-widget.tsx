import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";
import type { SiteSettings } from "@/types/settings";
import { ChatLauncher } from "./chat-launcher";

/**
 * Gelembung chat "Asisten VIDALIDAY" (PRD 6.11) di semua halaman publik, menggantikan tombol WhatsApp
 * mengambang. Komponen server tanpa JS; tombol WhatsApp ke admin tetap ada di header dan di dalam panel.
 */
export function ChatWidget({ settings }: { settings: Pick<SiteSettings, "whatsappNumber"> }) {
  return <ChatLauncher waHref={waLink(settings.whatsappNumber, GENERAL_INQUIRY_MESSAGE)} />;
}
