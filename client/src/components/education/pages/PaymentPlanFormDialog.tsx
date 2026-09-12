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
  createPaymentPlan,
  updatePaymentPlan,
  translatePaymentError,
} from "@/education/paymentService";
import { educationKeys } from "@/education/educationQueries";

export type PaymentPlanFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  organizationId: string;
  students: Array<{ id: string; name: string }>;
  plan?: {
    id: string;
    studentId: string;
    name: string;
    totalAmount: number;
  } | null;
};

export function PaymentPlanFormDialog({
  open,
  onOpenChange,
  onDone,
  organizationId,
  students,
  plan = null,
}: PaymentPlanFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = Boolean(plan);

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (plan) {
      setStudentId(plan.studentId);
      setName(plan.name);
      setTotalAmount(String(plan.totalAmount));
      setError(null);
    } else {
      setStudentId(students[0]?.id ?? "");
      setName("");
      setTotalAmount("");
      setError(null);
    }
  }, [open, plan, students]);

  const reset = () => {
    setStudentId("");
    setName("");
    setTotalAmount("");
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

  const trimmedName = name.trim();
  const parsedAmount = Number(totalAmount);

  const nameValidationError =
    trimmedName.length === 0
      ? "Plan adı boş bırakılamaz."
      : trimmedName.length > 160
        ? "Plan adı en fazla 160 karakter olabilir."
        : null;

  const amountValidationError =
    !totalAmount || Number.isNaN(parsedAmount) || parsedAmount <= 0
      ? "Toplam tutar sıfırdan büyük bir sayı olmalıdır."
      : null;

  const studentValidationError =
    !isEditMode && !studentId ? "Lütfen bir öğrenci seçin." : null;

  const formValidationError =
    studentValidationError ?? nameValidationError ?? amountValidationError;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (formValidationError || submitting || !organizationId) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (plan) {
        await updatePaymentPlan(organizationId, plan.id, {
          name: trimmedName,
          totalAmount: parsedAmount,
        });

        toast.success("Ödeme planı güncellendi", {
          description: `"${trimmedName}" planı güncellendi.`,
        });
      } else {
        await createPaymentPlan({
          organizationId,
          studentId,
          name: trimmedName,
          totalAmount: parsedAmount,
        });

        toast.success("Ödeme planı oluşturuldu", {
          description: `"${trimmedName}" planı başarıyla oluşturuldu.`,
        });
      }

      await Promise.all([
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
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            {isEditMode ? "Ödeme Planını Düzenle" : "Yeni Ödeme Planı"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            {isEditMode
              ? "Ödeme planının adı ve toplam tutarını güncelleyin."
              : "Öğrenciye ait yeni bir kayıt ve ödeme planı tanımlayın."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {!isEditMode && (
            <div className="space-y-1.5">
              <Label
                htmlFor="payment-plan-student"
                className="text-xs font-semibold text-slate-700"
              >
                Öğrenci
              </Label>
              <select
                id="payment-plan-student"
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                disabled={submitting}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {students.length === 0 ? (
                  <option value="">Kayıtlı öğrenci bulunamadı</option>
                ) : (
                  students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label
              htmlFor="payment-plan-name"
              className="text-xs font-semibold text-slate-700"
            >
              Plan / Paket Adı
            </Label>
            <Input
              id="payment-plan-name"
              placeholder="Örn: 2026-2027 YKS Hazırlık Paketi"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={submitting}
              maxLength={160}
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="payment-plan-amount"
              className="text-xs font-semibold text-slate-700"
            >
              Toplam Tutar (₺)
            </Label>
            <Input
              id="payment-plan-amount"
              type="number"
              placeholder="Örn: 36000"
              min="1"
              step="any"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
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
                  : "Planı Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
