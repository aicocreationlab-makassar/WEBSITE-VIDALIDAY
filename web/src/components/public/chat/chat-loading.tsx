/**
 * Penanda kecil "Menyiapkan chat" di atas tombol chat, selama modul panel/sheet diunduh pada pembukaan
 * pertama (jaringan lambat). Tanpa ikon lucide supaya tidak menambah muatan awal.
 */
export function ChatLoading() {
  return (
    <div
      role="status"
      className="fixed right-[calc(1rem+env(safe-area-inset-right))] bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-raised ring-1 ring-line above-cta:max-md:bottom-[calc(72px+5.25rem+env(safe-area-inset-bottom))] md:right-[calc(1.5rem+env(safe-area-inset-right))] md:bottom-[calc(6rem+env(safe-area-inset-bottom))]"
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 motion-reduce:animate-none"
      />
      Menyiapkan chat
    </div>
  );
}
