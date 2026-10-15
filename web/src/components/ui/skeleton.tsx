import { cn } from "@/lib/utils";

/** Blok surface-2 dengan shimmer halus; shimmer mati saat prefers-reduced-motion. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("skeleton-shimmer rounded-control", className)}
      {...props}
    />
  );
}

export { Skeleton };
