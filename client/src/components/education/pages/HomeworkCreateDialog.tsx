import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { isDemoMode } from "@/auth/runtime";
import { useAuth } from "@/auth/useAuth";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createHomework,
  updateHomework,
  translateHomeworkError,
} from "@/education/homeworkService";
import { useSubjects } from "@/education/educationQueries";
import { formatTrDate, getOrbitToday } from "@/education/trDate";
import { classes as demoClasses } from "../educationData";
import type { Homework, ClassGroup } from "../types";

export type HomeworkCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (item: Homework) => void;
  onUpdate?: (item: Homework) => void;
  onSaved?: () => Promise<void> | void;
  organizationId?: string;
  classes?: ClassGroup[];
  homework?: Homework | null;
};

export function HomeworkCreateDialog({
  open,
  onOpenChange,
  onCreate,
  onUpdate,
  onSaved,
  organizationId = "",
  classes = [],
  homework = null,
}: HomeworkCreateDialogProps) {
  const isEditMode = Boolean(homework);
  const { identity } = useAuth();
  const teacherName = identity?.displayName?.trim() ?? "";
  const role = identity?.membership?.role;

  const availableClasses = useMemo(() => {
    if (isDemoMode) {
      return teacherName
        ? demoClasses.filter(item => item.mentor === teacherName)
        : demoClasses;
    }
    if (role === "admin") {
      return classes;
    }
    const filtered = classes.filter(
      item =>
        (teacherName && item.mentor === teacherName) ||
        (identity?.membership?.membershipId &&
          item.mentorMembershipId === identity.membership.membershipId)
    );
    return filtered.length > 0 ? filtered : classes;
  }, [classes, teacherName, role, identity]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("__none__");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subjectsQuery = useSubjects({
    organizationId,
    enabled: open && !isDemoMode && Boolean(organizationId),
  });

  const availableSubjects = useMemo(() => {
    if (isDemoMode) {
      return [
        { id: "Matematik", name: "Matematik" },
        { id: "Türkçe", name: "Türkçe" },
        { id: "Fizik", name: "Fizik" },
        { id: "Kimya", name: "Kimya" },
        { id: "Biyoloji", name: "Biyoloji" },
        { id: "Geometri", name: "Geometri" },
      ];
    }
    return (subjectsQuery.data ?? []).map(s => ({ id: s.id, name: s.name }));
  }, [subjectsQuery.data]);

  const resetForm = useCallback(() => {
    setClassId(availableClasses[0]?.id ?? availableClasses[0]?.name ?? "");
    setSubjectId("__none__");
    setTitle("");
    setDescription("");
    setDueDate("");
    setError(null);
    setSubmitting(false);
  }, [availableClasses]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (homework) {
      const matchClass = availableClasses.find(
        c => c.id === homework.classId || c.name === homework.classGroup
      );
      setClassId(
        matchClass?.id ||
          matchClass?.name ||
          homework.classId ||
          homework.classGroup ||
          ""
      );
      setSubjectId(homework.subjectId ?? "__none__");
      setTitle(homework.title);
      setDescription(homework.description || "");
      // Doğrudan ISO alan: Türkçe metinden geri çözmek ikinci bir tarih
      // mantığı olurdu ve ay adı eşleşmezse sessizce boş tarih üretirdi.
      setDueDate(homework.rawDueDate);
      setError(null);
      setSubmitting(false);
    } else {
      resetForm();
    }
  }, [open, homework, resetForm, availableClasses]);

  const canSubmit =
    classId !== "" && title.trim() !== "" && dueDate !== "" && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0 || trimmedTitle.length > 200) {
      setError("Ödev başlığı 1 ile 200 karakter arasında olmalıdır.");
      return;
    }

    const selectedClass = availableClasses.find(
      c => c.id === classId || c.name === classId
    );
    const selectedClassName =
      selectedClass?.name || homework?.classGroup || classId;

    if (isDemoMode) {
      const selectedSubjectObj = availableSubjects.find(
        s => s.id === subjectId
      );
      const item: Homework = {
        id: isEditMode && homework ? homework.id : `hw-${Date.now()}`,
        classGroup: selectedClassName,
        classId: selectedClass?.id || homework?.classId,
        subject: selectedSubjectObj?.name ?? null,
        subjectId: selectedSubjectObj ? selectedSubjectObj.id : null,
        title: trimmedTitle,
        description: description.trim(),
        assignedBy: homework?.assignedBy ?? (teacherName || "Öğretmen"),
        assignedDate:
          homework?.assignedDate ??
          formatTrDate(new Date().toISOString().split("T")[0]),
        dueDate: formatTrDate(dueDate),
        rawDueDate: dueDate,
        status: dueDate < getOrbitToday() ? "Süresi Doldu" : "Aktif",
      };

      if (isEditMode) {
        onUpdate?.(item);
        toast.success("Ödev güncellendi", {
          description: `"${item.title}" ödevi güncellendi.`,
        });
      } else {
        onCreate?.(item);
        toast.success("Ödev oluşturuldu", {
          description: `${selectedClassName} sınıfına "${item.title}" ödevi eklendi.`,
        });
      }

      resetForm();
      onOpenChange(false);
      return;
    }

    if (!organizationId) {
      setError("Kurum bilgisi bulunamadı.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditMode && homework) {
        await updateHomework(organizationId, homework.id, {
          title: trimmedTitle,
          description: description.trim() || null,
          dueDate,
          subjectId: subjectId && subjectId !== "__none__" ? subjectId : null,
        });

        toast.success("Ödev güncellendi", {
          description: `"${trimmedTitle}" ödevi güncellendi.`,
        });
      } else {
        await createHomework({
          organizationId,
          classId: selectedClass?.id || classId,
          subjectId: subjectId && subjectId !== "__none__" ? subjectId : null,
          title: trimmedTitle,
          description: description.trim() || null,
          dueDate,
        });

        toast.success("Ödev oluşturuldu", {
          description: `${selectedClassName} sınıfına "${trimmedTitle}" ödevi eklendi.`,
        });
      }

      if (onSaved) {
        await onSaved();
      }
      resetForm();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = translateHomeworkError(err);
      setError(msg);
      toast.error(isEditMode ? "Ödev güncellenemedi" : "Ödev oluşturulamadı", {
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Ödevi düzenle" : "Yeni ödev oluştur"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Ödev detaylarını ve teslim tarihini güncelleyin."
                : "Sorumlu olduğunuz sınıflara ödev atayabilirsiniz."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label
                  htmlFor="hw-class"
                  className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400"
                >
                  Sınıf
                </Label>
                <select
                  id="hw-class"
                  value={classId}
                  onChange={event => setClassId(event.target.value)}
                  disabled={
                    submitting || isEditMode || availableClasses.length === 0
                  }
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13px] shadow-sm outline-none focus:border-blue-500 disabled:opacity-60"
                >
                  {availableClasses.length === 0 ? (
                    <option value="">Ödev verilebilecek bir sınıf yok</option>
                  ) : (
                    availableClasses.map(item => (
                      <option
                        key={item.id || item.name}
                        value={item.id || item.name}
                      >
                        {item.name}
                      </option>
                    ))
                  )}
                </select>
                {isEditMode ? (
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-400">
                    Sınıf bilgisi ödev oluşturulduktan sonra değiştirilemez.
                  </p>
                ) : availableClasses.length === 0 ? (
                  <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                    Ödev verilebilecek bir sınıf yok.
                  </p>
                ) : null}
              </div>
              <div>
                <Label
                  htmlFor="hw-subject"
                  className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400"
                >
                  Ders
                </Label>
                <select
                  id="hw-subject"
                  value={subjectId}
                  onChange={event => setSubjectId(event.target.value)}
                  disabled={submitting}
                  className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-[13px] shadow-sm outline-none focus:border-blue-500"
                >
                  <option value="__none__">Ders seçilmedi</option>
                  {availableSubjects.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label
                htmlFor="hw-title"
                className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400"
              >
                Başlık
              </Label>
              <Input
                id="hw-title"
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder="Örn. Türev Uygulamaları Deneme Seti"
                disabled={submitting}
                className="mt-1.5 h-9 text-[13px]"
              />
            </div>
            <div>
              <Label
                htmlFor="hw-description"
                className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400"
              >
                Açıklama
              </Label>
              <Textarea
                id="hw-description"
                value={description}
                onChange={event => setDescription(event.target.value)}
                placeholder="Ödevin kapsamı ve öğrencilerden beklenenler"
                disabled={submitting}
                className="mt-1.5 min-h-20 text-[13px]"
              />
            </div>
            <div>
              <Label
                htmlFor="hw-due-date"
                className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400"
              >
                Son teslim tarihi
              </Label>
              <Input
                id="hw-due-date"
                type="date"
                value={dueDate}
                onChange={event => setDueDate(event.target.value)}
                disabled={submitting}
                className="mt-1.5 h-9 text-[13px]"
              />
            </div>
            {error ? (
              <p className="text-[11px] font-semibold text-rose-600">{error}</p>
            ) : null}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={submitting}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting
                ? "Kaydediliyor…"
                : isEditMode
                  ? "Değişiklikleri kaydet"
                  : "Ödevi Oluştur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
