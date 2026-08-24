import { PlatformEmptyState, PlatformSection } from "./PlatformShell";
import type { PlatformAuditEvent } from "./platformService";

/**
 * Bilinen olay kodlarının okunabilir karşılıkları. Bilinmeyen kod ham haliyle
 * gösterilir — gizlenirse denetim kaydı, kaydı yazan koddan habersiz kalır.
 */
const ACTION_LABELS: Record<string, string> = {
  "platform.organization_created": "Kurum oluşturuldu",
  "platform.operator_added": "Operatör eklendi",
  "platform.operator_suspended": "Operatör askıya alındı",
  "platform.admin_password_reset": "Kurum yöneticisine yeni şifre üretildi",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlatformAuditLog({ events }: { events: PlatformAuditEvent[] }) {
  return (
    <PlatformSection
      title="Denetim Kaydı"
      description="Platform ekseninde yapılan işlemler. Kurum içi işlemler buraya değil, kurumun kendi denetim kaydına yazılır."
    >
      {events.length === 0 ? (
        <PlatformEmptyState
          title="Henüz kayıt yok"
          description="İlk kurum oluşturulduğunda burada görünecek."
        />
      ) : (
        <ol className="space-y-2">
          {events.map(event => (
            <li
              key={event.id}
              className="rounded-2xl border border-white/10 bg-white/[.03] px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[13px] font-bold">
                  {ACTION_LABELS[event.action] ?? (
                    <span className="font-mono">{event.action}</span>
                  )}
                </p>
                <time className="text-[11px] text-slate-500">
                  {formatDateTime(event.createdAt)}
                </time>
              </div>

              <p className="mt-1 text-[11px] leading-5 text-slate-400">
                {event.actorName ?? "Bilinmeyen kullanıcı"}
                {event.organizationName ? ` · ${event.organizationName}` : ""}
                {` · ${event.entityType}`}
              </p>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 text-[11px] leading-5 text-slate-500">
        Kayıtlar salt okunurdur ve istemciden yazılamaz; sahte kayıt
        üretilmesini engellemek için yazma yalnızca sunucu tarafındadır.
      </p>
    </PlatformSection>
  );
}
