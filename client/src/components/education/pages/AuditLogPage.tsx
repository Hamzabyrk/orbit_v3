import React, { useMemo } from "react";
import {
  describeAuditAction,
  describeAuditEntity,
  formatAuditMoment,
  type AuditActor,
} from "@/audit/auditService";
import { useOrganizationAuditEvents } from "@/audit/auditQueries";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
} from "../shared";

/**
 * Kurum denetim kaydı ekranı (#149, v1.2-12).
 *
 * `audit_events` Faz E'den beri yazılıyordu ama hiçbir ekran okumuyordu; bu
 * sayfa o boşluğu kapatıyor. İzlenebilirlik kararının vaadi buydu: "kaydın kim
 * tarafından yapıldığı **görünmelidir**".
 *
 * **Sistemdeki ilk gerçek sorgu ekranı.** Eğitim panelindeki diğer sayfalar
 * `educationData.ts`'ten besleniyor ve üretimde boş; bu sayfa doğrudan
 * veritabanını okuyor. Bu yüzden yükleniyor ve hata durumları burada gerçek —
 * uydurma değil.
 *
 * **Kapsam bilinçli olarak dar** (#149): kim, ne zaman, hangi işlem, hangi
 * varlık. `metadata` gösterilmiyor; bugün içinde `login_number` taşıyor ve
 * kişinin giriş numarasını yeni bir ekrana taşımak için sebep yok.
 */

/**
 * Aktörün nasıl görüneceği. Dört durumun dördü de farklı bir cümle kuruyor —
 * özellikle "kurum dışı" ile "çözülemedi" ayrımı: ilki bir olgu, ikincisi bir
 * bilgisizlik ve kullanıcıya ikisi aynı şeymiş gibi gösterilemez (K-09).
 */
function aktorGorunumu(actor: AuditActor): {
  metin: string;
  ton: "slate" | "amber";
  aciklama?: string;
} {
  if (actor.kind === "member") {
    return { metin: actor.name, ton: "slate" };
  }

  if (actor.kind === "outside") {
    return {
      metin: "Kurum dışı",
      ton: "slate",
      aciklama:
        "Kurumun üyesi olmayan bir aktör — kurumu kuran platform ekibi.",
    };
  }

  if (actor.kind === "system") {
    return {
      metin: "Sistem",
      ton: "slate",
      aciklama: "Kaydı yazan işlem bir kullanıcıya bağlı değil.",
    };
  }

  return {
    metin: "Çözülemedi",
    ton: "amber",
    aciklama:
      "Bu kaydın sahibi okunamadı. Kayıt gerçek; görünmeyen şey yalnızca isim.",
  };
}

export function AuditLogPage() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOrganizationAuditEvents();

  const kayitlar = useMemo(
    () => data?.pages.flatMap(page => page.rows) ?? [],
    [data]
  );

  const hataMesaji =
    error instanceof Error ? error.message : "Denetim kaydı yüklenemedi.";

  return (
    <>
      <PageHeader
        eyebrow="Kurum yönetimi"
        title="Denetim Kaydı"
        description="Kurumda kimin ne zaman hangi işlemi yaptığı. Kişisel veri içermez."
      />

      {isLoading ? (
        <TableSkeleton rows={5} columns={4} className="mt-6" />
      ) : isError ? (
        <ErrorState
          className="mt-6"
          title="Denetim kaydı görüntülenemedi"
          message={`${hataMesaji} Kaydın kendisi yerinde; başarısız olan görüntüleme.`}
          onRetry={() => void refetch()}
        />
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          {kayitlar.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyState
                title="Henüz kayıt yok"
                description="Kurumda iz bırakan bir işlem yapıldığında burada görünecek."
              />
            </div>
          ) : null}

          {kayitlar.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
                        Ne zaman
                      </th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
                        Kim
                      </th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
                        İşlem
                      </th>
                      <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
                        Varlık
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kayitlar.map(kayit => {
                      const aktor = aktorGorunumu(kayit.actor);
                      const an = formatAuditMoment(kayit.createdAt);

                      return (
                        <tr key={kayit.id}>
                          <td className="px-5 py-3 align-top text-[12px] text-slate-700">
                            {an ?? (
                              <span className="text-slate-400">
                                Tarih okunamadı
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <span className="text-[12px] font-bold text-slate-800">
                              {aktor.metin}
                            </span>
                            {aktor.aciklama ? (
                              <p className="mt-1 max-w-xs text-[10px] leading-4 text-slate-500">
                                {aktor.aciklama}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 align-top">
                            <Badge
                              tone={aktor.ton === "amber" ? "amber" : "blue"}
                            >
                              {describeAuditAction(kayit.action)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 align-top text-[12px] text-slate-700">
                            {describeAuditEntity(kayit.entityType)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasNextPage ? (
                <div className="border-t border-slate-100 p-4 text-center">
                  <button
                    type="button"
                    onClick={() => void fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isFetchingNextPage ? "Yükleniyor…" : "Daha fazla yükle"}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      )}
    </>
  );
}
