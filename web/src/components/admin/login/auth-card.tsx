import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/logo";

type AuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

/** Kartu kaca di tengah layar dengan logo, seperti halaman masuk admin (lupa / atur kata sandi). */
export function AuthCard({
  title,
  description,
  children,
  backHref = "/admin/login",
  backLabel = "Kembali ke halaman masuk",
}: AuthCardProps) {
  return (
    <main id="konten" className="flex min-h-dvh flex-col bg-surface px-4 py-8 sm:p-6">
      <div className="m-auto w-full max-w-md">
        <div className="glass-card rounded-sheet p-6 sm:p-8">
          <div className="flex justify-center">
            <Logo size="lg" tone="admin" />
          </div>
          <div className="mt-6 text-center">
            <h1 className="text-h1 font-extrabold tracking-tight text-ink">{title}</h1>
            {description ? <p className="mt-1.5 text-sm text-muted">{description}</p> : null}
          </div>
          <div className="mt-6">{children}</div>
        </div>
        <div className="mt-4 flex justify-center">
          <Link
            href={backHref}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
