import * as React from "react";
import { cn } from "@/lib/utils";

// DESIGN 4.5 (dari .glass-input situs lama): putih, border 1.5px, radius 12, tinggi 48px,
// fokus border brand-500 + ring 3px 12%. Teks minimal 16px (iOS tidak zoom).
const inputClass =
  "glass-input flex h-12 w-full min-w-0 rounded-control px-3.5 text-base text-ink transition-[border-color,box-shadow] outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-semibold disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted aria-invalid:border-danger aria-invalid:focus-visible:shadow-[0_0_0_3px_rgb(185_28_28/0.12)]";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn(inputClass, className)} {...props} />;
}

export { Input, inputClass };
