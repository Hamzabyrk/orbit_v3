import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import {
  DEFAULT_AUDIT_LIMIT,
  loadOrganizationAuditEvents,
  type AuditPage,
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
  const limit = options?.limit ?? DEFAULT_AUDIT_LIMIT;

  return useInfiniteQuery<
    AuditPage<OrganizationAuditEvent>,
    Error,
    InfiniteData<AuditPage<OrganizationAuditEvent>, number | null>,
    readonly [string, string, { readonly organizationId: string }],
    number | null
  >({
    queryKey: organizationId
      ? auditKeys.events(organizationId)
      : (["audit", "events", { organizationId: "" }] as const),
    queryFn: ({ pageParam }) =>
      // `organizationId` burada kesin dolu: `enabled` onsuz sorguyu hiç
      // çalıştırmıyor ve anahtar da onu taşıyor.
      loadOrganizationAuditEvents(organizationId!, limit, pageParam),
    initialPageParam: null,
    getNextPageParam: lastPage => lastPage.nextCursor,
    enabled: Boolean(organizationId),
  });
}
