/** Isi sementara halaman publik (diganti di fase 3–4). */
export function PagePlaceholder({
  title,
  text = "Halaman ini sedang disiapkan.",
}: {
  title: string;
  text?: string;
}) {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 md:py-18 lg:px-8">
      <h1 className="max-w-3xl text-h1 font-extrabold tracking-tight text-balance text-ink md:text-h1-lg">{title}</h1>
      <p className="mt-3 max-w-[70ch] text-base leading-[26px] text-muted">{text}</p>
    </div>
  );
}
