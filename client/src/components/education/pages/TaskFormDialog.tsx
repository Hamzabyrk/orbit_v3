import { useState } from "react";
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
import { educationKeys } from "@/education/educationQueries";
import {
  createTask,
  updateTask,
  type TaskItem,
} from "@/education/dayPlanService";

export type TaskFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  membershipId: string;
  task?: TaskItem | null;
  initialDueOn?: string | null;
  onDone?: () => void;
};

export function TaskFormDialog({
  open,
  onOpenChange,
  organizationId,
  membershipId,
  task,
  initialDueOn,
  onDone,
}: TaskFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(task?.id);

  const [title, setTitle] = useState<string>(() => task?.title ?? "");
  const [detail, setDetail] = useState<string>(() => task?.detail ?? "");
  const [dueOn, setDueOn] = useState<string>(
    () => task?.dueOn ?? initialDueOn ?? ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !membershipId) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Lütfen görev başlığı girin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && task?.id) {
        await updateTask(organizationId, task.id, {
          title: trimmedTitle,
          detail: detail.trim() || null,
          dueOn: dueOn || null,
        });
        toast.success("Görev güncellendi", {
          description: `"${trimmedTitle}" başlıklı görev başarıyla güncellendi.`,
        });
      } else {
        await createTask({
          organizationId,
          ownerMembershipId: membershipId,
          title: trimmedTitle,
          detail: detail.trim() || null,
          dueOn: dueOn || null,
        });
        toast.success("Görev eklendi", {
          description: `"${trimmedTitle}" başlıklı görev planınıza eklendi.`,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: educationKeys.tasks(organizationId, membershipId),
      });

      onOpenChange(false);
      onDone?.();
    } catch (err) {
      // 🔴 Hatayı servis çevirir, ekran yalnız taşır — ikinci kez çevirme (K-23)
      setError(
        err instanceof Error ? err.message : "Görev işlemi kaydedilemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Görevi Düzenle" : "Yeni Görev Ekle"}
            </DialogTitle>
            <DialogDescription>
              Kişisel çalışma alanınız için görev ve not tanımlayın.
            </DialogDescription>
          </DialogHeader>

          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-[12px] font-medium text-rose-700"
            >
              {error}
            </div>
          ) : null}

          {/* Görev Başlığı */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="task-title" className="text-[12px] font-semibold">
                Görev Başlığı <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400">
                {title.length} / 200
              </span>
            </div>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Örn: 12-A sınıfı ödev kontrolleri"
              disabled={loading}
              className="h-9 text-[12px]"
            />
          </div>

          {/* Vade Tarihi (due_on) */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due" className="text-[12px] font-semibold">
              Son Tarih (İsteğe bağlı)
            </Label>
            <Input
              id="task-due"
              type="date"
              value={dueOn}
              onChange={e => setDueOn(e.target.value)}
              disabled={loading}
              className="h-9 text-[12px]"
            />
          </div>

          {/* Detay / Açıklama */}
          <div className="space-y-1.5">
            <Label htmlFor="task-detail" className="text-[12px] font-semibold">
              Detay Notları{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (İsteğe bağlı)
              </span>
            </Label>
            <textarea
              id="task-detail"
              value={detail}
              onChange={e => setDetail(e.target.value)}
              rows={3}
              placeholder="Göreve ilişkin notlar ve ayrıntılar..."
              disabled={loading}
              className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[12px] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-9 rounded-lg border border-slate-200 px-4 text-[12px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-4 text-[12px] font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {loading
                ? "Kaydediliyor…"
                : isEditing
                  ? "Değişiklikleri Kaydet"
                  : "Görevi Ekle"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
