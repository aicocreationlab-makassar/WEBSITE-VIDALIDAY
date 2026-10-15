"use client";

import { Children, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Jumlah item yang tampil sebelum diperluas. */
  initial: number;
  /** Label grup untuk pembaca layar. */
  label: string;
  className?: string;
  itemClassName?: string;
  /** Satu child = satu item (dirender di server, dibungkus <li> di sini). */
  children: React.ReactNode;
};

/** Daftar dengan "Lihat semua (n)" yang memperluas di tempat. Item tersembunyi tetap ada di HTML. */
export function ExpandableList({ initial, label, className, itemClassName, children }: Props) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const extra = items.length > initial;

  return (
    <>
      <ul id={id} aria-label={label} className={className}>
        {items.map((item, i) => (
          <li key={i} className={cn(itemClassName, !expanded && i >= initial && "hidden")}>
            {item}
          </li>
        ))}
      </ul>
      {extra ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls={id}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-control font-semibold text-brand-700 hover:underline"
        >
          {expanded ? "Tampilkan lebih sedikit" : `Lihat semua (${items.length})`}
          <ChevronDown
            className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>
      ) : null}
    </>
  );
}
