import { PlatformEmptyState, PlatformSection } from "./PlatformShell";
import type { PlatformOperatorRow } from "./platformService";

const ROLE_LABELS: Record<PlatformOperatorRow["role"], string> = {
  owner: "Sahip",
  operator: "Operatör",
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Salt okunur. Operatör ekleme/çıkarma istemciden yapılamaz: `platform_operators`
 * tablosunda `authenticated` için yazma yolu yok ve bu bilinçli. Aksi halde bir
 * operatör kendi yetkisini yükseltebilir veya başkasını sessizce ekleyebilirdi.
 * Ekleme yalnızca `service_role` ile yapılır (bkz. Faz D4).
 */
export function PlatformOperators({
  operators,
}: {
  operators: PlatformOperatorRow[];
}) {
  return (
    <PlatformSection
      title="Operatörler"
      description="Platform yetkisi olan geliştirme ekibi üyeleri. Bu liste salt okunurdur."
    >
      {operators.length === 0 ? (
        <PlatformEmptyState
          title="Operatör kaydı görünmüyor"
          description="Bu ekranı görebiliyorsanız en az bir operatör kaydınız var demektir. Liste boşsa bağlantı sorunu olabilir; sayfayı yenileyin."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="bg-white/[.04] text-[10px] uppercase tracking-[.12em] text-slate-400">
                <th className="px-4 py-3 font-bold">Kişi</th>
                <th className="px-4 py-3 font-bold">Yetki</th>
                <th className="px-4 py-3 font-bold">Durum</th>
                <th className="px-4 py-3 font-bold">Eklenme</th>
                <th className="px-4 py-3 font-bold">Not</th>
              </tr>
            </thead>
            <tbody>
              {operators.map(operator => (
                <tr
                  key={operator.userId}
                  className="border-t border-white/[.06]"
                >
                  <td className="px-4 py-3 font-bold">
                    {operator.displayName ?? (
                      <span className="font-mono text-slate-500">
                        {operator.userId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{ROLE_LABELS[operator.role]}</td>
                  <td className="px-4 py-3">
                    {operator.status === "active" ? (
                      <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        Aktif
                      </span>
                    ) : (
                      <span className="rounded-md bg-rose-400/15 px-2 py-1 text-[10px] font-bold text-rose-300">
                        Askıda
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(operator.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {operator.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-5 text-slate-500">
        Operatör ekleme ve çıkarma panelden yapılmaz. Bir operatörün kendi
        yetkisini yükseltebilmesini engellemek için yazma yolu yalnızca sunucu
        tarafındadır.
      </p>
    </PlatformSection>
  );
}
