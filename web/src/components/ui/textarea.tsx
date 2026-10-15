import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "glass-input flex field-sizing-content min-h-24 w-full rounded-control px-3.5 py-3 text-base leading-relaxed text-ink outline-none disabled:cursor-not-allowed disabled:bg-surface-2 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
