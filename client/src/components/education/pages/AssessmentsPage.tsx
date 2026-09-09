import * as React from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { isDemoMode } from "@/auth/runtime";
import { useAuth } from "@/auth/useAuth";
import {
  formatExamSummary,
  type LatestExamDetail,
} from "@/education/examService";
import {
  assessmentFollowUp,
  assessmentHeaderInfo,
  assessmentStatsByRole,
  assessmentSubjects,
} from "../educationData";
import {
  Badge,
  CardSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
  StatCard,
} from "../shared";
import type { Role, Section } from "../types";

export function AssessmentsPage({
  role,
  onNavigate,
  exam,
  isLoading = false,
  error = null,
  onRetry,
  isDemo = isDemoMode,
}: {
  role: Role;
  onNavigate: (section: Section) => void;
  exam?: LatestExamDetail | null;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isDemo?: boolean;
}) {
  const { identity } = useAuth();

  // Güvenlik kapısı (K-06 & Bulgu 2): isDemo prop'u üretimde (isDemoMode === false) demoyu AÇAMAZ.
  // Prop yalnızca test ortamında veya demo modunda demoyu KAPATMAK (isDemo={false}) için kullanılabilir.
  const activeDemo = isDemoMode && isDemo;
  const isPersonal = role === "student" || role === "parent";
  const stats = isPersonal
    ? assessmentStatsByRole.personal
    : assessmentStatsByRole.institution;

  const studentName = identity?.displayName?.trim()
    ? identity.displayName.trim().split(" ")[0]
    : null;

  return (
    <>
      <PageHeader
        eyebrow="Ölçme ve değerlendirme"
        title={isPersonal ? "Akademik gelişim" : "Sınavlar ve başarı"}
        description={
          isPersonal
            ? "Son denemeler ve konu bazlı gelişim sinyalleri."
            : "Deneme sonuçları, sınıf görünümü ve takip önerileri."
        }
        action={
          activeDemo && (role === "admin" || role === "teacher")
            ? "Sonuç gir"
            : undefined
        }
        onAction={
          activeDemo && (role === "admin" || role === "teacher")
            ? () =>
                toast.info("Sonuç girişi", {
                  description:
                    "Demo MVP’de sonuç girişi ekranı değerlendirme veri modelinin sonraki adımıdır.",
                })
            : undefined
        }
      />

      {!activeDemo ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-[12px] text-blue-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="font-bold">
              Sınav sonuç girişi ve detaylı analizler v1.4 sürümünde açılacaktır
            </p>
            <p className="mt-0.5 text-[11px] text-blue-700">
              Şu anda kayıtlı en son sınav oturumu salt okunur olarak
              görüntülenmektedir. Detaylı istatistikler ve veri girişi sonraki
              sürümde aktif hale getirilecektir.
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <CardSkeleton className="mt-6" />
      ) : error ? (
        <ErrorState
          className="mt-6"
          title="Sınav bilgileri görüntülenemedi"
          message={
            error.message || "Sınav bilgileri yüklenirken bir hata oluştu."
          }
          onRetry={onRetry}
        />
      ) : !activeDemo && !exam ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <EmptyState
            title="Henüz sınav kaydı yok"
            description="Kurumda kayıtlı bir sınav oturumu bulunamadı."
          />
        </section>
      ) : !activeDemo ? (
        // ÜRETİM GÖRÜNÜMÜ (v1.3-01d · K-22):
        // Yalnızca doğrulanmış gerçek sınav başlığı, tarih ve katılımcı sayısı çizilir.
        // Kaynağı veya hesaplama kuralı olmayan alanlar (tavsiyeler, odak alanı,
        // konu bazlı ortalamalar, önceki denemeyle karşılaştırma) K-22 gereği çizilmez.
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold text-slate-900">
                {exam!.name}
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatExamSummary(exam!)}
              </p>
            </div>
            <Badge tone="blue">Kayıtlı Sınav</Badge>
          </div>
        </section>
      ) : (
        // DEMO GÖRÜNÜMÜ: Mevcut interaktif ve zengin demo görünümü birebir korunur
        <div
          className={`mt-6 grid gap-6 ${
            assessmentFollowUp ? "xl:grid-cols-[1.25fr_.75fr]" : ""
          }`}
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[17px] font-extrabold text-slate-900">
                  {assessmentHeaderInfo?.title ?? "Değerlendirme özeti"}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {assessmentHeaderInfo
                    ? `${assessmentHeaderInfo.date} · ${
                        isPersonal
                          ? (studentName ?? assessmentHeaderInfo.studentName)
                          : assessmentHeaderInfo.participantSummary
                      }`
                    : "Henüz yayınlanmış bir değerlendirme kaydı bulunmuyor."}
                </p>
              </div>
              {assessmentHeaderInfo?.statusBadge ? (
                <Badge tone="green">{assessmentHeaderInfo.statusBadge}</Badge>
              ) : null}
            </div>
            {stats.length > 0 ? (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {stats.map(stat => (
                  <StatCard
                    key={stat.label}
                    label={stat.label}
                    value={stat.value}
                    detail={stat.detail}
                    icon={stat.icon}
                    tone={stat.tone}
                  />
                ))}
              </div>
            ) : null}
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-extrabold text-slate-700">
                Konu bazlı görünüm
              </p>
              {assessmentSubjects.length === 0 ? (
                <div className="mt-3">
                  <EmptyState title="Konu bazlı değerlendirme verisi yok" />
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {assessmentSubjects.map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-[10px] font-bold">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="text-slate-400">{item.value}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <span
                          style={{ width: `${item.value}%` }}
                          className={`block h-full rounded-full ${item.color}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
          {assessmentFollowUp ? (
            <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
              <h2 className="text-[15px] font-extrabold text-amber-900">
                Takip önerisi
              </h2>
              <p className="mt-2 text-[11px] leading-5 text-amber-800">
                {isPersonal
                  ? assessmentFollowUp.personalNote
                  : assessmentFollowUp.institutionNote}
              </p>
              {!isPersonal && (
                <button
                  onClick={() => onNavigate("İletişim")}
                  className="mt-4 text-[11px] font-bold text-amber-800 underline underline-offset-4"
                >
                  Veli bilgilendirmesi oluştur
                </button>
              )}
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
