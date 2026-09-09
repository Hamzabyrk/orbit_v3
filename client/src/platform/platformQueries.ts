import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import {
  loadAuditEvents,
  loadOperators,
  loadOrganizations,
  loadOrganizationStats,
  type OrganizationStats,
  type PlatformAuditEvent,
  type PlatformOperatorRow,
  type PlatformOrganization,
} from "./platformService";

/**
 * Platform alanı sorgu anahtarları (v1.3-02 · a parçası, **K-19** / mimari kararlar).
 *
 * **Anahtar sözleşmesi:** `[alan, kaynak, kapsam]`
 *
 * - Platform geneli kaynaklar `{ scope: "platform" }` kapsamını taşır.
 *   Operatör zaten kurumlar üstü tüm kayıtları görmeye yetkilidir. Çıkışta
 *   önbellek `clearIdentity` içinde tamamen temizlenir (`identityRace.test.ts`).
 *
 * - Kurum istatistikleri `{ organizationId }` kapsamını taşır (**K-19** / izolasyon).
 *   Operatör kurumlar arasında gezerken farklı kurumların istatistiklerinin birbirine
 *   karışması (cache collision) engellenir.
 *
 * Anahtar üreticisi `organizationId: string` parametresini zorunlu kılarak
 * kurumsuz anahtar oluşturulmasını derleme zamanında (TypeScript) engeller.
 */
export const platformKeys = {
  all: ["platform"] as const,
  organizations: () =>
    ["platform", "organizations", { scope: "platform" }] as const,
  operators: () => ["platform", "operators", { scope: "platform" }] as const,
  auditEvents: () =>
    ["platform", "auditEvents", { scope: "platform" }] as const,
  organizationStats: (organizationId: string) =>
    ["platform", "organizationStats", { organizationId }] as const,
};

export type UsePlatformOrganizationsOptions = {
  enabled?: boolean;
};

/**
 * Platformdaki kurumların listesini getiren React Query hook'u.
 *
 * Operatör yetkisi `useAuth` üzerinden doğrulanır; operatör olmayan kullanıcılar
 * için sorgu çalıştırılmaz (`enabled: false`).
 */
export function usePlatformOrganizations(
  options?: UsePlatformOrganizationsOptions
) {
  const { identity } = useAuth();
  const isOperator = Boolean(identity?.platformOperator);
  const isEnabled = (options?.enabled ?? true) && isOperator;

  return useQuery<PlatformOrganization[], Error>({
    queryKey: platformKeys.organizations(),
    queryFn: () => loadOrganizations(),
    enabled: isEnabled,
  });
}

export type UsePlatformOperatorsOptions = {
  enabled?: boolean;
};

/**
 * Platformdaki operatörlerin listesini getiren React Query hook'u.
 *
 * Operatör yetkisi `useAuth` üzerinden doğrulanır; operatör olmayan kullanıcılar
 * için sorgu çalıştırılmaz (`enabled: false`).
 */
export function usePlatformOperators(options?: UsePlatformOperatorsOptions) {
  const { identity } = useAuth();
  const isOperator = Boolean(identity?.platformOperator);
  const isEnabled = (options?.enabled ?? true) && isOperator;

  return useQuery<PlatformOperatorRow[], Error>({
    queryKey: platformKeys.operators(),
    queryFn: () => loadOperators(),
    enabled: isEnabled,
  });
}

export type UsePlatformAuditEventsOptions = {
  enabled?: boolean;
};

/**
 * Platform genel denetim kayıtlarını getiren React Query hook'u.
 *
 * Operatör yetkisi `useAuth` üzerinden doğrulanır; operatör olmayan kullanıcılar
 * için sorgu çalıştırılmaz (`enabled: false`).
 */
export function usePlatformAuditEvents(
  options?: UsePlatformAuditEventsOptions
) {
  const { identity } = useAuth();
  const isOperator = Boolean(identity?.platformOperator);
  const isEnabled = (options?.enabled ?? true) && isOperator;

  return useQuery<PlatformAuditEvent[], Error>({
    queryKey: platformKeys.auditEvents(),
    queryFn: () => loadAuditEvents(),
    enabled: isEnabled,
  });
}

export type UseOrganizationStatsOptions = {
  enabled?: boolean;
};

/**
 * Belirli bir kurumun yapısal sayılarını getiren React Query hook'u.
 *
 * Kurum kimliği sağlanmamışsa veya kullanıcı operatör değilse sorgu çalıştırılmaz (`enabled: false`).
 * Kuruma özgü anahtarlama sayesinde farklı kurumlar arasında gezinirken sayıların karışması önlenir.
 */
export function useOrganizationStats(
  organizationId?: string,
  options?: UseOrganizationStatsOptions
) {
  const { identity } = useAuth();
  const isOperator = Boolean(identity?.platformOperator);
  const isEnabled =
    (options?.enabled ?? true) && Boolean(organizationId) && isOperator;

  return useQuery<OrganizationStats | null, Error>({
    queryKey: organizationId
      ? platformKeys.organizationStats(organizationId)
      : (["platform", "organizationStats", { organizationId: "" }] as const),
    queryFn: () => loadOrganizationStats(organizationId!),
    enabled: isEnabled,
  });
}
