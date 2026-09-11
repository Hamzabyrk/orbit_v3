import { useState, useEffect } from "react";
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
import { createExam, translateExamError } from "@/education/examService";
import type { ClassGroup } from "../types";

export type ExamFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (newExamId: string) => void;
  organizationId: string;
  classes: ClassGroup[];
};

export function ExamFormDialog({
  open,
  onOpenChange,
  onDone,
  organizationId,
  classes = [],
}: ExamFormDialogProps) {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [examDate, setExamDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [maxScore, setMaxScore] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setClassId(classes[0]?.id ?? "");
      setExamDate(new Date().toISOString().split("T")[0]);
      setMaxScore("");
      setError(null);
      setSubmitting(false);
    }
  }, [open, classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Sınav adı zorunludur.");
      return;
    }
    if (trimmedName.length > 160) {
      setError(translateExamError({ code: "23514" }));
      return;
    }
    if (!classId) {
      setError("Lütfen bir sınıf seçin.");
      return;
    }

    let parsedMaxScore: number | null = null;
    if (maxScore.trim() !== "") {
      const parsed = Number(maxScore);
      if (Number.isNaN(parsed) || parsed <= 0) {
        setError("Tam puan pozitif bir sayı olmalıdır.");
        return;
      }
      parsedMaxScore = parsed;
    }

    if (!organizationId) {
      setError("Kurum bilgisi bulunamadı.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { id } = await createExam({
        organizationId,
        classId,
        name: trimmedName,
        examDate,
        maxScore: parsedMaxScore,
      });

      toast.success("Sınav oluşturuldu", {
        description: `${trimmedName} sınavı kaydedildi.`,
      });
      onOpenChange(false);
      onDone(id);
    } catch (err: unknown) {
      const msg = translateExamError(err);
      setError(msg);
      toast.error("Sınav oluşturulamadı", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Yeni Sınav Oluştur</DialogTitle>
            <DialogDescription>
              Sınıf için yeni bir sınav kaydı oluşturun ve sonuç girişini
              başlatın.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="exam-name"
                className="text-xs font-bold text-slate-700"
              >
                Sınav Adı <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="exam-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Örn. TYT Deneme 01"
                disabled={submitting}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="exam-class"
                className="text-xs font-bold text-slate-700"
              >
                Sınıf <span className="text-rose-500">*</span>
              </Label>
              <select
                id="exam-class"
                value={classId}
                onChange={e => setClassId(e.target.value)}
                disabled={submitting || classes.length === 0}
                className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm outline-none focus:border-blue-500"
              >
                {classes.length === 0 ? (
                  <option value="">Kayıtlı sınıf yok</option>
                ) : (
                  classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-date"
                  className="text-xs font-bold text-slate-700"
                >
                  Tarih <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="exam-date"
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  disabled={submitting}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="exam-max-score"
                  className="text-xs font-bold text-slate-700"
                >
                  Tam Puan (Opsiyonel)
                </Label>
                <Input
                  id="exam-max-score"
                  type="number"
                  step="any"
                  value={maxScore}
                  onChange={e => setMaxScore(e.target.value)}
                  placeholder="Örn. 100 veya 500"
                  disabled={submitting}
                  className="text-xs"
                />
              </div>
            </div>
            {error ? (
              <p className="text-[11px] font-semibold text-rose-600">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !classId}
              className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? "Oluşturuluyor…" : "Sınavı Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
