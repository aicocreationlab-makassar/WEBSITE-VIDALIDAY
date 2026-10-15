"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useWatch } from "react-hook-form";
import { Check, RotateCcw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/admin/kit/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { cn } from "@/lib/utils";
import { BOOKING_PLACEHOLDERS } from "@/lib/whatsapp";
import { CharCount, FieldAside, useSettingsFormContext } from "./form-bits";
import { SETTINGS_MAX, checkTemplate, insertToken, previewMessage } from "./settings-model";

const DEFAULT_TEMPLATE = DEFAULT_SETTINGS.bookingWhatsappTemplate;

type Selection = { start: number; end: number };

/**
 * Editor template pesan WhatsApp form sewa (PRD 6.5, 7.9): chip isian yang disisipkan di posisi
 * kursor, peringatan isian tidak dikenal/penting yang belum dipakai, dan pratinjau pesan langsung
 * dengan data tamu contoh (fillTemplate yang sama dengan form sewa).
 */
export function TemplateEditor({ isDefault }: { isDefault: boolean }) {
  const {
    register,
    setValue,
    control,
    formState: { errors, isSubmitted },
  } = useSettingsFormContext();
  const template = useWatch({ control, name: "bookingWhatsappTemplate" }) ?? "";
  const [withNote, setWithNote] = useState(false);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const selection = useRef<Selection | null>(null);
  const previewId = useId();
  const { ref: fieldRef, onBlur: fieldBlur, ...field } = register("bookingWhatsappTemplate");

  const preview = useMemo(() => previewMessage(template, withNote), [template, withNote]);
  const check = useMemo(() => checkTemplate(template), [template]);

  function remember() {
    const element = textarea.current;
    if (element) selection.current = { start: element.selectionStart, end: element.selectionEnd };
  }

  function update(next: string) {
    setValue("bookingWhatsappTemplate", next, { shouldDirty: true, shouldValidate: isSubmitted });
  }

  function insert(key: string) {
    const element = textarea.current;
    const current = element?.value ?? template;
    // Belum pernah diklik: sisipkan di akhir.
    const at = selection.current ?? { start: current.length, end: current.length };
    const next = insertToken(current, at.start, at.end, `{${key}}`);
    update(next.value);
    selection.current = { start: next.caret, end: next.caret };
    requestAnimationFrame(() => {
      if (!element) return;
      element.focus({ preventScroll: true });
      element.setSelectionRange(next.caret, next.caret);
    });
  }

  function restoreDefault() {
    update(DEFAULT_TEMPLATE);
    selection.current = null;
    toast.success("Template bawaan dipasang. Simpan untuk menerapkan.");
  }

  const chips = (
    <div
      role="group"
      aria-label="Sisipkan isian ke template"
      className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 sm:flex-wrap sm:overflow-visible"
    >
      {BOOKING_PLACEHOLDERS.map((placeholder) => {
        const used = check.used.includes(placeholder.key);
        return (
          <Tooltip key={placeholder.key}>
            <TooltipTrigger asChild>
              <button
                type="button"
                // Kursor dan seleksi di textarea tetap (desktop) saat chip diklik.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(placeholder.key)}
                aria-label={`Sisipkan ${placeholder.label}${used ? " (sudah dipakai)" : ""}`}
                className={cn(
                  "inline-flex h-11 shrink-0 items-center gap-1 rounded-full border px-3 font-mono text-[13px] font-semibold transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-brand-500/20 sm:h-9",
                  used
                    ? "border-line bg-surface text-ink-2 hover:bg-surface-2"
                    : "border-brand-200 bg-white text-brand-700 hover:bg-brand-50",
                )}
              >
                {used ? <Check className="size-3.5 text-success" aria-hidden="true" /> : null}
                {`{${placeholder.key}}`}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">{placeholder.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
      <div className="grid min-w-0 gap-3">
        <Field
          label="Template pesan WhatsApp"
          required
          error={errors.bookingWhatsappTemplate?.message}
          hint="Ketuk isian untuk menyisipkannya di posisi kursor. Isian diganti data tamu saat form sewa dikirim."
          aside={
            <FieldAside
              isDefault={isDefault}
              count={<CharCount value={template} max={SETTINGS_MAX.bookingWhatsappTemplate} />}
            />
          }
        >
          <TemplateInput
            {...field}
            ref={(element: HTMLTextAreaElement | null) => {
              fieldRef(element);
              textarea.current = element;
            }}
            chips={chips}
            onBlur={(event) => {
              remember();
              void fieldBlur(event);
            }}
            onSelect={remember}
            onKeyUp={remember}
            rows={14}
            maxLength={SETTINGS_MAX.bookingWhatsappTemplate}
            spellCheck={false}
            autoCapitalize="sentences"
          />
        </Field>

        {check.unknown.length ? (
          <Warning>
            Isian {check.unknown.join(", ")} tidak dikenal, jadi tampil apa adanya di pesan. Pakai isian dari daftar di
            atas.
          </Warning>
        ) : null}
        {check.missing.length ? (
          <Warning>
            Template belum memuat {check.missing.map((key) => `{${key}}`).join(", ")}. Tanpa isian ini kamu tidak tahu
            unit atau tanggal yang diminta tamu.
          </Warning>
        ) : null}

        <div>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={restoreDefault}
            disabled={template === DEFAULT_TEMPLATE}
          >
            <RotateCcw aria-hidden="true" />
            Kembalikan template bawaan
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 content-start gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3">
          <p id={previewId} className="text-sm leading-5 font-semibold text-ink-2">
            Pratinjau pesan
          </p>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink-2">
            <Switch checked={withNote} onCheckedChange={setWithNote} />
            Tamu mengisi catatan
          </label>
        </div>
        <section aria-labelledby={previewId} className="rounded-card bg-surface-2 p-3 ring-1 ring-line sm:p-4">
          <div className="ml-auto w-fit max-w-full rounded-2xl rounded-tr-sm bg-white px-3.5 py-3 text-sm leading-6 whitespace-pre-wrap text-ink shadow-card [overflow-wrap:anywhere]">
            {preview || "Pesan masih kosong. Isi template dulu."}
          </div>
        </section>
        <p className="text-caption text-muted">
          Baris yang isiannya kosong otomatis dihapus. Data tamu di pratinjau hanya contoh.
        </p>
      </div>
    </div>
  );
}

type TemplateInputProps = React.ComponentProps<"textarea"> & { chips: React.ReactNode };

/** Chip isian + textarea. id dan aria-* dari <Field> diteruskan ke textarea. */
function TemplateInput({ chips, className, ...props }: TemplateInputProps) {
  return (
    <div className="grid min-w-0 gap-2">
      {chips}
      <Textarea
        {...props}
        className={cn("min-h-0 resize-y font-mono text-[15px] leading-6 field-sizing-fixed", className)}
      />
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-caption font-medium text-[#b45309]">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
