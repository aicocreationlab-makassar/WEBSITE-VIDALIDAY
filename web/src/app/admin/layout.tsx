import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Penyedia khusus admin (login, lupa/atur kata sandi, panel). Toast dan tooltip hanya dipakai di
 * sini, jadi situs publik tidak ikut memuat sonner dan Radix Tooltip.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <TooltipProvider delayDuration={300}>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
