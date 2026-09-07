import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import {
  loadOrganizationAuditEvents,
  type OrganizationAuditEvent,
} from "./auditService";

/**
 * Denetim kaydı sorgu anahtarları (v1.3-00, **K-19** / mimari kararlar).
 *
 * **Anahtar sözleşmesi:** `[alan, kaynak, kapsam]`
 *
 * Kapsam HER ZAMAN aktif kurumu taşır. Bu bir kod düzeni tercihi değil,
 * **izolasyon kuralıdır**: kurum kimliği anahtarda yoksa, iki kuruma da erişimi
 * olan bir kullanıcı kurum değiştirdiğinde React Query önceki kurumun satırlarını
 * önbellekten (cache) servis eder ve RLS bunu engelleyemez — çünkü istek
 * sunucuya hiç gitmez.
 *
 * Anahtar üreticisi `organizationId: string` parametresini zorunlu kılarak
 * kurumsuz anahtar oluşturulmasını derleme zamanında (TypeScript) engeller.
 */
export const auditKeys = {
  all: ["audit"] as const,
  events: (organizationId: string) =>
    ["audit", "events", { organizationId }] as const,
};

export type UseOrganizationAuditEventsOptions = {
  organizationId?: string;
  limit?: number;
};

/**
 * Aktif kurumun denetim kayıtlarını getiren React Query hook'u.
 *
 * Aktif kurum kimliği `useAuth` üzerinden sağlanır; kurum kimliği henüz
 * çözümlenmemişse veya kullanıcı bir kuruma ait değilse sorgu çalıştırılmaz (`enabled: false`).
 */
export function useOrganizationAuditEvents(
  options?: UseOrganizationAuditEventsOptions
) {
  const { identity } = useAuth();
  const organizationId =
    options?.organizationId ?? identity?.membership?.organizationId;
  const limit = options?.limit ?? 50;

  return useQuery<OrganizationAuditEvent[], Error>({
    queryKey: organizationId
      ? auditKeys.events(organizationId)
      : (["audit", "events", { organizationId: "" }] as const),
    queryFn: () => loadOrganizationAuditEvents(limit),
    enabled: Boolean(organizationId),
  });
}
