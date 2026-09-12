import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createInstallment,
  updateInstallment,
  translatePaymentError,
  type Installment,
} from "@/education/paymentService";
import { educationKeys } from "@/education/educationQueries";

export type InstallmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  organizationId: string;
  planId: string;
  installment?: Installment | null;
  suggestedSequenceNo?: number;
};

export function InstallmentFormDialog({
  open,
  onOpenChange,
  onDone,
  organizationId,
  planId,
  installment = null,
  suggestedSequenceNo = 1,
}: InstallmentFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = Boolean(installment);

  const [sequenceNo, setSequenceNo] = useState<string>("1");
  const [dueDate, setDueDate] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (installment) {
      setSequenceNo(String(installment.sequenceNo));
      setDueDate(installment.dueDate || "");
      setAmount(String(installment.amount));
      setError(null);
    } else {
      setSequenceNo(String(suggestedSequenceNo));
      // Varsayılan vade tarihi: bugün (YYYY-MM-DD)
      const todayIso = new Date().toISOString().slice(0, 10);
      setDueDate(todayIso);
      setAmount("");
      setError(null);
    }
  }, [open, installment, suggestedSequenceNo]);

  const reset = () => {
    setSequenceNo("1");
    setDueDate("");
    setAmount("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) {
      return;
    }
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const parsedSequenceNo = Number(sequenceNo);
  const parsedAmount = Number(amount);

  const sequenceValidationError =
    !isEditMode &&
    (!sequenceNo ||
      Number.isNaN(parsedSequenceNo) ||
      !Number.isInteger(parsedSequenceNo) ||
      parsedSequenceNo < 1)
      ? "Sıra numarası 1 veya daha büyük bir tam sayı olmalıdır."
      : null;

  const dueDateValidationError =
    !dueDate || dueDate.trim().length !== 10
      ? "Lütfen geçerli bir vade tarihi seçin (YYYY-AA-GG)."
      : null;

  const amountValidationError =
    !amount || Number.isNaN(parsedAmount) || parsedAmount <= 0
      ? "Taksit tutarı sıfırdan büyük bir sayı olmalıdır."
      : null;

  const formValidationError =
    sequenceValidationError ?? dueDateValidationError ?? amountValidationError;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (formValidationError || submitting || !organizationId || !planId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (installment) {
        // UPDATE: sequence_no şemada değiştirilemez; yalnızca due_date ve amount güncellenir
        await updateInstallment(organizationId, installment.id, {
          dueDate,
          amount: parsedAmount,
        });

        toast.success("Taksit güncellendi", {
          description: `${installment.sequenceNo}. taksit bilgileri güncellendi.`,
        });
      } else {
        await createInstallment({
          organizationId,
          planId,
          sequenceNo: parsedSequenceNo,
          dueDate,
          amount: parsedAmount,
        });

        toast.success("Taksit eklendi", {
          description: `${parsedSequenceNo}. taksit plana eklendi.`,
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: educationKeys.planInstallments(organizationId, planId),
        }),
        queryClient.invalidateQueries({
          queryKey: educationKeys.payments(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: educationKeys.paymentOverview(organizationId),
        }),
        queryClient.invalidateQueries({
          queryKey: educationKeys.students(organizationId),
        }),
      ]);

      handleOpenChange(false);
      onDone?.();
    } catch (err) {
      const msg = translatePaymentError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {isEditMode ? "Taksiti Düzenle" : "Yeni Taksit Ekle"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isEditMode
              ? "Taksitin vade tarihini veya tutarını güncelleyin."
              : "Ödeme planına yeni bir taksit satırı ekleyin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label
              htmlFor="installment-sequence"
              className="text-xs font-semibold text-slate-700"
            >
              Sıra No {isEditMode && "(Değiştirilemez)"}
            </Label>
            <Input
              id="installment-sequence"
              type="number"
              min="1"
              step="1"
              value={sequenceNo}
              onChange={e => setSequenceNo(e.target.value)}
              disabled={isEditMode || submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="installment-due-date"
              className="text-xs font-semibold text-slate-700"
            >
              Vade Tarihi
            </Label>
            <Input
              id="installment-due-date"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="installment-amount"
              className="text-xs font-semibold text-slate-700"
            >
              Tutar (₺)
            </Label>
            <Input
              id="installment-amount"
              type="number"
              min="1"
              step="any"
              placeholder="Örn: 5000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          <DialogFooter className="pt-2">
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={Boolean(formValidationError) || submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting
                ? "Kaydediliyor..."
                : isEditMode
                  ? "Güncelle"
                  : "Taksiti Ekle"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
