"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/**
 * State filter admin di query URL (bisa di-bookmark, PRD 7.4). Perubahan memakai router.replace
 * dan menghapus "hal" (kembali ke halaman 1) kecuali yang diubah adalah "hal" sendiri.
 * Harus dipakai di dalam <Suspense> (layout panel admin sudah menyediakannya).
 */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (changes: Record<string, string | number | null | undefined>, options: { push?: boolean } = {}) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, String(value));
      }
      if (!("hal" in changes)) next.delete("hal");
      const query = next.toString();
      const href = query ? `${pathname}?${query}` : pathname;
      startTransition(() => {
        if (options.push) router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const reset = useCallback(
    (keep: string[] = []) => {
      const next = new URLSearchParams();
      for (const key of keep) {
        const value = searchParams.get(key);
        if (value) next.set(key, value);
      }
      const query = next.toString();
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  return { searchParams, update, reset, pending };
}
