"use client";

import { useEffect, useState } from "react";
import { useController, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/admin/kit/field";
import { ResponsiveDialog } from "@/components/admin/locations/responsive-dialog";
import { SwitchField } from "@/components/admin/locations/switch-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createFaq, updateFaq } from "@/lib/actions/admin/faqs";
import type { ActionResult } from "@/lib/actions/admin/guard";
import { faqSchema } from "@/lib/validation/admin";
import { ANSWER_MAX, QUESTION_MAX, mentionsLegacyButton, type AdminFaqRow } from "./faq-model";

type FaqInput = z.input<typeof faqSchema>;
type FaqData = z.output<typeof faqSchema>;
type FaqField = keyof FaqInput;

const FIELDS: readonly FaqField[] = ["question", "answer", "sortOrder", "isActive"];
const SORT_ORDER_ERROR = "Isi urutan dengan angka bulat 0 sampai 100.000.";
const NETWORK_ERROR = "Perubahan gagal disimpan. Periksa koneksi lalu coba lagi.";
const ANSWER_HINT = "Hindari menyebut tombol lama seperti Pesan via WhatsApp; tombol sekarang bernama Sewa sekarang.";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = tambah pertanyaan baru. */
  faq: AdminFaqRow | null;
  /** Urutan awal untuk pertanyaan baru (max + 1). */
  defaultSortOrder: number;
  /** Berubah setiap kali dialog dibuka, supaya form mulai dari nilai awal lagi. */
  formKey: string;
};

/** Dialog tambah/ubah FAQ: modal di desktop, bottom sheet di HP (PRD 7.7). Badge lama tidak diubah. */
export function FaqFormDialog({ open, onOpenChange, faq, defaultSortOrder, formKey }: Props) {
  const [busy, setBusy] = useState(false);
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      busy={busy}
      title={faq ? "Ubah pertanyaan" : "Tambah pertanyaan"}
      description={
        faq
          ? "Perubahan langsung tampil di beranda, halaman apartemen, dan detail unit."
          : "Jawab singkat dan jelas, seperti membalas chat tamu."
      }
    >
      <FaqForm
        key={formKey}
        faq={faq}
        defaultSortOrder={defaultSortOrder}
        onCancel={() => onOpenChange(false)}
        onSaved={() => onOpenChange(false)}
        onBusyChange={setBusy}
      />
    </ResponsiveDialog>
  );
}

type FormProps = {
  faq: AdminFaqRow | null;
  defaultSortOrder: number;
  onCancel: () => void;
  onSaved: () => void;
  onBusyChange: (busy: boolean) => void;
};

function FaqForm({ faq, defaultSortOrder, onCancel, onSaved, onBusyChange }: FormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FaqInput, unknown, FaqData>({
    resolver: zodResolver(faqSchema),
    defaultValues: {
      question: faq?.question ?? "",
      answer: faq?.answer ?? "",
      sortOrder: faq?.sortOrder ?? defaultSortOrder,
      isActive: faq?.isActive ?? true,
    },
  });
  const activeField = useController({ control, name: "isActive" });
  const [question, answer] = useWatch({ control, name: ["question", "answer"] });
  const legacyButton = mentionsLegacyButton(question) || mentionsLegacyButton(answer);

  useEffect(() => {
    onBusyChange(isSubmitting);
  }, [isSubmitting, onBusyChange]);

  const onSubmit = async (values: FaqData) => {
    let result: ActionResult<unknown>;
    try {
      result = faq ? await updateFaq(faq.id, values) : await createFaq(values);
    } catch {
      toast.error(NETWORK_ERROR);
      return;
    }
    if (result.ok) {
      toast.success(faq ? "Perubahan disimpan" : (result.message ?? "Pertanyaan ditambahkan"));
      onSaved();
      return;
    }
    let focused = false;
    for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
      if ((FIELDS as readonly string[]).includes(field)) {
        setError(field as FaqField, { message }, { shouldFocus: !focused });
        focused = true;
      }
    }
    toast.error(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5" aria-busy={isSubmitting || undefined}>
      <Field label="Pertanyaan" required error={errors.question?.message} aside={`${(question ?? "").length}/${QUESTION_MAX}`}>
        <Input
          {...register("question")}
          maxLength={QUESTION_MAX}
          autoComplete="off"
          placeholder="mis. Jam berapa check-in dan check-out?"
        />
      </Field>

      <Field
        label="Jawaban"
        required
        error={errors.answer?.message}
        hint={`${ANSWER_HINT} Pisahkan paragraf dengan satu baris kosong.`}
        aside={`${(answer ?? "").length}/${ANSWER_MAX}`}
      >
        <Textarea {...register("answer")} maxLength={ANSWER_MAX} rows={6} className="min-h-36" />
      </Field>

      {legacyButton ? (
        <p role="status" className="flex items-start gap-2 rounded-control bg-amber-50 px-3.5 py-3 text-sm text-ink-2 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-[#b45309]" aria-hidden="true" />
          <span>Teks ini masih menyebut tombol lama. Ganti dengan &quot;Sewa sekarang&quot; supaya tamu tidak bingung.</span>
        </p>
      ) : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Urutan" error={errors.sortOrder ? SORT_ORDER_ERROR : undefined} hint="Angka kecil tampil lebih dulu. Lima teratas tampil di beranda.">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            max={100_000}
            step={1}
            {...register("sortOrder", {
              setValueAs: (value: unknown) => (value === "" || value == null ? undefined : Number(value)),
            })}
          />
        </Field>

        <SwitchField
          label="Aktif"
          checked={Boolean(activeField.field.value)}
          onCheckedChange={(checked) => activeField.field.onChange(checked)}
          onBlur={activeField.field.onBlur}
          onText="Tampil di situs"
          offText="Disembunyikan"
          hint="Kalau mati, pertanyaan ini tidak tampil di situs."
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {faq ? "Simpan perubahan" : "Simpan pertanyaan"}
        </Button>
      </div>
    </form>
  );
}
