import { cn } from "@/lib/utils";

type FormCardProps = {
  title: string;
  description?: string;
  /** Aksi kecil di kanan judul (mis. tautan "Kelola fasilitas"). */
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Grid 2 kolom di desktop untuk field (DESIGN 5: form). */
  columns?: 1 | 2;
  id?: string;
};

/** Kartu per bagian form admin: judul 16/700 + deskripsi 14 muted, padding 20–24 (DESIGN 5). */
export function FormCard({ title, description, action, children, className, columns = 1, id }: FormCardProps) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-judul` : undefined} className={cn("glass-card rounded-card p-5 sm:p-6", className)}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 id={id ? `${id}-judul` : undefined} className="text-base font-bold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("grid gap-5", columns === 2 && "md:grid-cols-2")}>{children}</div>
    </section>
  );
}

/** Judul halaman admin di dalam konten: deskripsi + aksi utama (judul utama ada di topbar). */
export function AdminPageHeader({
  description,
  actions,
  className,
}: {
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  if (!description && !actions) return null;
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      {description ? <p className="max-w-2xl text-sm text-muted">{description}</p> : <span />}
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
