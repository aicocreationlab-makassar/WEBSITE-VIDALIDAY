"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ICON_CHOICES, Icon, resolveIconName, type IconChoice } from "@/lib/icons";
import { cn } from "@/lib/utils";

type Props = {
  value: string | null | undefined;
  onChange: (name: string) => void;
  choices?: IconChoice[];
  id?: string;
  /** Label untuk pembaca layar kalau tidak dibungkus <Field>. */
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

/** Pemilih ikon (PRD 7.6, DESIGN 5): popover dengan pencarian, grid ikon 40px, terpilih ber-ring brand-500. */
export function IconPicker({ value, onChange, choices = ICON_CHOICES, id, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const current = resolveIconName(value, choices[0]?.name ?? "check");
  const label = choices.find((c) => c.name === current)?.label ?? current;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          {...aria}
          className="glass-input flex h-12 w-full items-center gap-3 rounded-control px-3.5 text-left text-base text-ink"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-brand-50 text-brand-600">
            <Icon name={current} className="size-5" />
          </span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <ChevronDown className="size-4 text-muted" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,340px)] p-0" align="start">
        <Command
          filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder="Cari ikon, mis. kolam" />
          <CommandList className="max-h-72">
            <CommandEmpty>Ikon tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-4 gap-1 p-1">
                {choices.map((choice) => (
                  <CommandItem
                    key={choice.name}
                    value={`${choice.label} ${choice.name} ${choice.keywords ?? ""}`}
                    onSelect={() => {
                      onChange(choice.name);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex h-auto flex-col items-center gap-1 rounded-control px-1 py-2 text-center text-[11px] leading-tight text-ink-2",
                      choice.name === current && "bg-brand-50 text-brand-700 ring-2 ring-brand-500",
                    )}
                    aria-selected={choice.name === current}
                  >
                    <Icon name={choice.name} className="size-5" />
                    <span className="line-clamp-2">{choice.label}</span>
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
