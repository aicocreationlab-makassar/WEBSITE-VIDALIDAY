import { Construction } from "lucide-react";

type AdminPlaceholderProps = {
  title: string;
  description?: string;
  phase: 5 | 6;
};

/** Kartu sementara untuk halaman admin yang belum dibangun. */
export function AdminPlaceholder({ title, description, phase }: AdminPlaceholderProps) {
  return (
    <section className="glass-card max-w-3xl rounded-card p-6">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-surface-2 text-ink-2">
          <Construction className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-card font-bold text-ink">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          <p className="mt-3 text-sm font-medium text-ink-2">Halaman ini dibangun di Fase {phase}.</p>
        </div>
      </div>
    </section>
  );
}
