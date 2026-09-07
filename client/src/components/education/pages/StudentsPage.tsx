import { Search } from "lucide-react";
import { Badge, EmptyState, PageHeader } from "../shared";
import type { Role, Student } from "../types";

export function StudentsPage({
  role,
  students: visibleStudents,
  query,
  onQuery,
  onSelect,
  onAdd,
  isLoading = false,
  error = null,
  truncated = false,
  limit,
}: {
  // Zorunlu: bir rol kapısının varsayılanı olmaz. Opsiyonel olsaydı
  // varsayılanı en geniş yetki olurdu ve prop'u geçmeyi unutan bir çağrı
  // "Yeni öğrenci" düğmesini sessizce herkese açardı (K-04).
  role: Role;
  students: Student[];
  query: string;
  onQuery: (value: string) => void;
  onSelect: (student: Student) => void;
  onAdd: () => void;
  isLoading?: boolean;
  error?: Error | null;
  truncated?: boolean;
  /** Üst sınırın tek kaynağı servistedir; bant onu tekrar etmez, gösterir (K-06). */
  limit?: number;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Öğrenci operasyonları"
        title="Öğrenciler"
        description="Akademik gelişim, devam ve ödeme sinyallerini öğrenci bazında takip edin."
        action={role === "admin" ? "Yeni öğrenci" : undefined}
        onAction={role === "admin" ? onAdd : undefined}
      />
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={event => onQuery(event.target.value)}
            placeholder="Öğrenci adı, kodu veya sınıf ara..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-[12px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>
      {truncated ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] font-semibold text-amber-800">
          Liste üst sınıra ({limit} kayıt) ulaştı. Kalan kayıtları görmek için
          filtreleri kullanın.
        </div>
      ) : null}
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        {isLoading ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[12px] font-extrabold text-slate-700">
              Öğrenciler yükleniyor…
            </p>
          </div>
        ) : error ? (
          <div className="px-5 py-8">
            <EmptyState
              title="Öğrenciler görüntülenemedi"
              description={`${error.message} Sayfayı yenilemeyi deneyin.`}
            />
          </div>
        ) : visibleStudents.length === 0 ? (
          <EmptyState
            title="Gösterilecek öğrenci yok"
            description={
              query
                ? "Arama kriterlerine uygun öğrenci bulunamadı."
                : "Akademik öğrenci ve sınıf kayıtları bir sonraki aşamada (v1.2) sisteme bağlanacaktır; şu an listelenecek kayıtlı öğrenci bulunmuyor."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-400">
                  <th className="px-5 py-3.5">Öğrenci</th>
                  <th className="px-5 py-3.5">Sınıf</th>
                  <th className="px-5 py-3.5">Devam</th>
                  <th className="px-5 py-3.5">Son sınav</th>
                  <th className="px-5 py-3.5">Takip</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map(student => (
                  <tr
                    key={student.id}
                    className="border-b border-slate-100 text-[12px] last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-[11px] font-extrabold text-blue-700">
                          {student.name
                            .split(" ")
                            .map(part => part[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="font-extrabold text-slate-800">
                            {student.name}
                          </p>
                          {student.code || student.parent ? (
                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {[
                                student.code,
                                student.parent
                                  ? `Veli: ${student.parent}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-600">
                      {student.group}
                    </td>
                    <td className="px-5 py-4">
                      {student.attendance !== undefined ? (
                        <Badge
                          tone={student.attendance < 90 ? "amber" : "green"}
                        >
                          %{student.attendance}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 font-extrabold text-slate-800">
                      {student.score !== undefined
                        ? `${student.score} puan`
                        : null}
                    </td>
                    <td className="px-5 py-4">
                      {student.risk ? (
                        <Badge
                          tone={
                            student.risk === "Takip gerekli" ? "amber" : "green"
                          }
                        >
                          {student.risk}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => onSelect(student)}
                        className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50"
                      >
                        Profili aç
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
