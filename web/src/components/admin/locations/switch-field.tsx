"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";

type Props = {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onBlur?: () => void;
  /** Teks status di samping switch, mis. "Tampil di situs" / "Disembunyikan". */
  onText: string;
  offText: string;
  hint?: React.ReactNode;
  disabled?: boolean;
};

/** Switch berlabel untuk form admin (label di atas, status di samping, petunjuk di bawah). */
export function SwitchField({ label, checked, onCheckedChange, onBlur, onText, offText, hint, disabled }: Props) {
  const id = useId();
  const hintId = useId();
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm leading-5 font-semibold text-ink-2">
        {label}
      </label>
      <div className="flex min-h-12 items-center gap-3">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          onBlur={onBlur}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
        />
        <span className="text-sm text-ink-2" aria-hidden="true">
          {checked ? onText : offText}
        </span>
      </div>
      {hint ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
