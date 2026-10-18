import { cva, type VariantProps } from "class-variance-authority";

// DESIGN 4.4: primary (satu aksi utama per layar), secondary, ghost, icon.
// Ukuran md 44px, lg 52px (CTA mobile). Kalimat biasa, bukan huruf kapital semua.
// Modul terpisah dari button.tsx (tanpa Slot/lucide) supaya elemen biasa, mis. halaman galat,
// bisa memakai gaya tombol tanpa ikut membundel komponen Button.
export const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 rounded-control border border-transparent font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out select-none focus-visible:ring-3 focus-visible:ring-brand-500/20 active:not-disabled:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white font-bold hover:bg-brand-700 active:bg-brand-800",
        secondary:
          "border-[1.5px] border-line bg-white text-ink hover:bg-surface-2 aria-expanded:bg-surface-2",
        outline:
          "border-[1.5px] border-brand-600 bg-white text-brand-700 hover:bg-brand-50 aria-expanded:bg-brand-50",
        ghost: "text-brand-700 hover:bg-brand-50 aria-expanded:bg-brand-50",
        quiet: "text-ink-2 hover:bg-surface-2 hover:text-ink aria-expanded:bg-surface-2",
        destructive: "bg-danger text-white font-bold hover:bg-brand-800",
        link: "h-auto px-0 text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-sm [&_svg:not([class*='size-'])]:size-4",
        md: "h-11 px-4 text-[15px]",
        lg: "h-[52px] px-5 text-base",
        icon: "size-11",
        "icon-sm": "size-9 [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;
