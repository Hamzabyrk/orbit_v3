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
  createCalendarEvent,
  updateCalendarEvent,
  type CalendarEventItem,
} from "@/education/dayPlanService";
import { getOrbitToday, orbitLocalDate } from "@/education/trDate";

export type CalendarEventFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  membershipId: string;
  event?: CalendarEventItem | null;
  initialDate?: string;
  onDone?: () => void;
};

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  organizationId,
  membershipId,
  event,
  initialDate,
  onDone,
}: CalendarEventFormDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(event?.id);

  // Mevcut etkinlikten veya başlangıç tarihinden gün ve saatleri ayıkla
  //
  // `startsAt` bir `timestamptz`, yani bir AN — ilk on karakteri kesmek UTC
  // gününü verir ve gece 00:00-03:00 arasında başlayan bir etkinliğin formu
  // DÜNKÜ tarihle açılırdı. Aynı alanı `dayPlanHelpers` baştan beri doğru
  // çeviriyordu, yani takvim ızgarası ile form ayrı günler gösteriyordu
  // (v1.5-09).
  const defaultDate = event?.startsAt
    ? orbitLocalDate(event.startsAt)
    : (initialDate ?? getOrbitToday());

  const defaultStartTime = event?.startsAt
    ? new Date(event.startsAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "09:00";

  const defaultEndTime = event?.endsAt
    ? new Date(event.endsAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const [title, setTitle] = useState<string>(() => event?.title ?? "");
  const [subtitle, setSubtitle] = useState<string>(() => event?.subtitle ?? "");
  const [date, setDate] = useState<string>(() => defaultDate);
  const [startTime, setStartTime] = useState<string>(() => defaultStartTime);
  const [endTime, setEndTime] = useState<string>(() => defaultEndTime);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !membershipId) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Lütfen bir etkinlik başlığı girin.");
      return;
    }

    if (!date || !startTime) {
      setError("Tarih ve başlangıç saati zorunludur.");
      return;
    }

    const startsAtIso = new Date(`${date}T${startTime}:00`).toISOString();
    let endsAtIso: string | null = null;

    if (endTime) {
      const startDt = new Date(`${date}T${startTime}:00`);
      const endDt = new Date(`${date}T${endTime}:00`);
      if (endDt <= startDt) {
        setError("Bitiş saati başlangıç saatinden sonra olmalıdır.");
        return;
      }
      endsAtIso = endDt.toISOString();
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && event?.id) {
        await updateCalendarEvent(organizationId, event.id, {
          title: trimmedTitle,
          subtitle: subtitle.trim() || null,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
        });
        toast.success("Etkinlik güncellendi", {
          description: `"${trimmedTitle}" başlıklı etkinlik güncellendi.`,
        });
      } else {
        await createCalendarEvent({
          organizationId,
          ownerMembershipId: membershipId,
          title: trimmedTitle,
          subtitle: subtitle.trim() || null,
          startsAt: startsAtIso,
          endsAt: endsAtIso,
        });
        toast.success("Etkinlik eklendi", {
          description: `"${trimmedTitle}" başlıklı etkinlik takviminize eklendi.`,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: educationKeys.calendarEvents(organizationId, membershipId),
      });

      onOpenChange(false);
      onDone?.();
    } catch (err) {
      // 🔴 Hatayı servis çevirir, ekran yalnız taşır — ikinci kez çevirme (K-23)
      setError(
        err instanceof Error ? err.message : "Etkinlik işlemi kaydedilemedi."
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
              {isEditing ? "Etkinliği Düzenle" : "Yeni Etkinlik Ekle"}
            </DialogTitle>
            <DialogDescription>
              Kişisel takviminiz için görüşme veya etkinlik planlayın.
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

          {/* Başlık */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="event-title"
                className="text-[12px] font-semibold"
              >
                Etkinlik Başlığı <span className="text-rose-500">*</span>
              </Label>
              <span className="text-[11px] text-slate-400">
                {title.length} / 200
              </span>
            </div>
            <Input
              id="event-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Örn: 12-A Veli Bilgilendirme Görüşmesi"
              disabled={loading}
              className="h-9 text-[12px]"
            />
          </div>

          {/* Alt Başlık / Not */}
          <div className="space-y-1.5">
            <Label
              htmlFor="event-subtitle"
              className="text-[12px] font-semibold"
            >
              Açıklama veya Yer{" "}
              <span className="text-[11px] font-normal text-slate-400">
                (İsteğe bağlı)
              </span>
            </Label>
            <Input
              id="event-subtitle"
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="Örn: Ahmet Bey ile telefon görüşmesi / Odada"
              disabled={loading}
              className="h-9 text-[12px]"
            />
          </div>

          {/* Tarih */}
          <div className="space-y-1.5">
            <Label htmlFor="event-date" className="text-[12px] font-semibold">
              Tarih <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="event-date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={loading}
              required
              className="h-9 text-[12px]"
            />
          </div>

          {/* Başlangıç ve Bitiş Saati */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="event-start"
                className="text-[12px] font-semibold"
              >
                Başlangıç Saati <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="event-start"
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                disabled={loading}
                required
                className="h-9 text-[12px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end" className="text-[12px] font-semibold">
                Bitiş Saati{" "}
                <span className="text-[11px] font-normal text-slate-400">
                  (İsteğe bağlı)
                </span>
              </Label>
              <Input
                id="event-end"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                disabled={loading}
                className="h-9 text-[12px]"
              />
            </div>
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
                  : "Etkinliği Ekle"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
