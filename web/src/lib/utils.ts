import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Daftarkan token kustom dari globals.css supaya twMerge tidak menganggap
// `text-caption` sebagai warna (dan membuang `text-ink`) atau sebaliknya.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "caption",
        "card",
        "h1",
        "h1-lg",
        "h2",
        "h2-lg",
        "hero",
        "hero-lg",
        "price",
        "price-lg",
        "price-xl",
      ],
      radius: ["control", "card", "sheet"],
      shadow: ["card", "card-hover", "raised", "sticky"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
