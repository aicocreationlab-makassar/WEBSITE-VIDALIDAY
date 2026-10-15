import { WhatsappIcon } from "@/components/icons/whatsapp";
import { GENERAL_INQUIRY_MESSAGE, waLink } from "@/lib/whatsapp";

/**
 * Tombol WhatsApp mengambang (56px) di kanan bawah, memperhitungkan safe area iPhone.
 * Hanya dipasang oleh layout `(with-fab)`: beranda, /sewa, /apartemen/*, /about.
 */
export function FloatingWhatsapp({ number }: { number: string }) {
  return (
    <a
      href={waLink(number, GENERAL_INQUIRY_MESSAGE)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat admin via WhatsApp"
      data-testid="fab-whatsapp"
      className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(1rem+env(safe-area-inset-bottom))] z-30 inline-flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-raised transition-colors duration-150 hover:bg-brand-700 focus-visible:outline-offset-4 active:bg-brand-800 md:right-[calc(1.5rem+env(safe-area-inset-right))] md:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]"
    >
      <WhatsappIcon className="size-7" />
    </a>
  );
}
