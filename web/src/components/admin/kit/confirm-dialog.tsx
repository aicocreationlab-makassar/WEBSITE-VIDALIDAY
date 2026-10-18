"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Judul spesifik, mis. "Hapus unit Studio AT 26X?" */
  title: string;
  description?: string;
  /** Label tindakan spesifik, mis. "Hapus unit" (bukan "Ya"). */
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  /** Atur fokus sendiri saat ditutup (mis. elemen pembukanya sudah dihapus). */
  onCloseAutoFocus?: (event: Event) => void;
};

/** Dialog konfirmasi dengan label tindakan spesifik (PRD 7.10). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  destructive = false,
  loading = false,
  onConfirm,
  onCloseAutoFocus,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent className="sm:max-w-sm" showCloseButton={false} onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader className="pr-0">
          {destructive ? (
            <span className="mb-1 flex size-11 items-center justify-center rounded-control border border-brand-200 bg-brand-50 text-brand-700">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
          ) : null}
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
