import * as React from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { isDemoMode } from "@/auth/runtime";
import {
  attendanceLessonInfo,
  students as defaultStudents,
} from "../educationData";
import { filterAttendanceStudents } from "../scopeFilters";
import { Badge, EmptyState, PageHeader } from "../shared";
import type { AttendanceState, Role, Student } from "../types";
import {
  ATTENDANCE_STATES,
  getAttendanceTone,
} from "@/education/attendanceStatus";
import type { AttendanceSessionDetail } from "@/education/attendanceService";
import { formatSessionTitle } from "@/education/attendanceService";

export function AttendancePage({
  role,
  attendances,
  setAttendances,
  students: studentList = defaultStudents,
  session,
  isLoading = false,
  error = null,
  isDemo = isDemoMode,
}: {
  role: Role;
  attendances: Record<string, AttendanceState>;
  setAttendances: React.Dispatch<
    React.SetStateAction<Record<string, AttendanceState>>
  >;
  students?: Student[];
  session?: AttendanceSessionDetail | null;
  isLoading?: boolean;
  error?: Error | null;
  isDemo?: boolean;
}) {
  // Güvenlik kapısı (Bulgu 2): isDemo prop'u üretimde (isDemoMode === false) demoyu AÇAMAZ.
  // Prop yalnızca test ortamında veya demo modunda demoyu KAPATMAK (isDemo={false}) için kullanılabilir.
  const activeDemo = isDemoMode && isDemo;
  const states = ATTENDANCE_STATES;
  const demoSelected = filterAttendanceStudents(studentList, role, activeDemo);

  return (
    <>
      <PageHeader
        eyebrow="Ders operasyonu"
        title="Yoklama"
        description={
          !activeDemo
            ? session
              ? "Son ders yoklama kaydı görüntüleniyor."
              : "Ders yoklama kayıtları."
            : (attendanceLessonInfo?.pageDescription ??
              "Ders yoklamasını tamamlayın ve kaydedin.")
        }
        action={activeDemo ? "Yoklamayı kaydet" : undefined}
        onAction={
          activeDemo
            ? () => {
                toast.info("Yoklama kaydı henüz aktif değil", {
                  description:
                    "Yoklama altyapısı kalıcı veri fazında kurulacaktır; şu an bir kayıt oluşturulmadı.",
                });
              }
            : undefined
        }
      />

      {!activeDemo ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/80 px-4 py-3 text-[12px] text-blue-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="font-bold">
              Yoklama alma ve düzenleme v1.4 sürümünde açılacaktır
            </p>
            <p className="mt-0.5 text-[11px] text-blue-700">
              Şu anda kayıtlı en son yoklama oturumu salt okunur olarak
              görüntülenmektedir. Durum butonları bu sürümde etkileşime
              kapalıdır.
            </p>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          Yoklama oturumu yükleniyor...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50/80 p-6 text-sm text-rose-800 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          {error.message || "Yoklama bilgileri yüklenirken bir hata oluştu."}
        </div>
      ) : !activeDemo && !session ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <EmptyState
            title="Henüz yoklama kaydı yok"
            description="Kurumda kayıtlı bir yoklama oturumu bulunamadı."
          />
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[12px] font-extrabold text-slate-800">
                {activeDemo
                  ? (attendanceLessonInfo?.groupTitle ?? "Yoklama Listesi")
                  : formatSessionTitle(session!)}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {activeDemo
                  ? (attendanceLessonInfo?.groupDetail ??
                    `${demoSelected.length} kayıtlı öğrenci`)
                  : `${session!.records.length} kayıtlı öğrenci`}
              </p>
            </div>
            <Badge tone={activeDemo ? "amber" : "blue"}>
              {activeDemo ? "Taslak" : "Kayıtlı Oturum"}
            </Badge>
          </div>

          <div className="divide-y divide-slate-100">
            {activeDemo ? (
              // DEMO MODU: Mevcut interaktif davranış aynen korunur
              <>
                {demoSelected.length === 0 ? (
                  <EmptyState
                    title="Henüz öğrenci kaydı yok"
                    description="Yoklama alabilmek için önce öğrenci eklenmesi gerekir."
                  />
                ) : null}
                {demoSelected.map(student => (
                  <div
                    key={student.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex min-w-[220px] items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600">
                        {student.name
                          .split(" ")
                          .map(word => word[0])
                          .join("")}
                      </span>
                      <div>
                        <p className="text-[12px] font-extrabold text-slate-800">
                          {student.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {student.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {states.map(state => (
                        <button
                          key={state}
                          type="button"
                          onClick={() => {
                            setAttendances(current => ({
                              ...current,
                              [student.id]: state,
                            }));
                          }}
                          className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                            attendances[student.id] === state
                              ? "bg-slate-900 text-white"
                              : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                          }`}
                        >
                          {state}
                        </button>
                      ))}
                    </div>
                    <div className="sm:ml-auto">
                      <Badge tone={getAttendanceTone(attendances[student.id])}>
                        {attendances[student.id]}
                      </Badge>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              // ÜRETİM MODU: Salt okunur, durum butonları devre dışı, v1.4'te yazma gelecek
              <>
                {session!.records.length === 0 ? (
                  <EmptyState
                    title="Bu oturumda öğrenci kaydı yok"
                    description="Yoklama oturumuna henüz öğrenci kaydı işlenmemiş."
                  />
                ) : null}
                {session!.records.map(record => {
                  const studentObj = studentList.find(
                    s => s.id === record.studentId
                  );
                  const displayName = studentObj?.name || record.studentName;
                  const displayCode = studentObj?.code;

                  return (
                    <div
                      key={record.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-[220px] items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600">
                          {displayName
                            .split(" ")
                            .filter(Boolean)
                            .map(word => word[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="text-[12px] font-extrabold text-slate-800">
                            {displayName}
                          </p>
                          {displayCode ? (
                            <p className="text-[10px] text-slate-400">
                              {displayCode}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {states.map(state => {
                          const isCurrent = record.status === state;
                          return (
                            <button
                              key={state}
                              type="button"
                              disabled={true}
                              aria-disabled="true"
                              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                                isCurrent
                                  ? "bg-slate-900 text-white cursor-default"
                                  : "bg-slate-50 text-slate-400 cursor-not-allowed opacity-60"
                              }`}
                            >
                              {state}
                            </button>
                          );
                        })}
                      </div>
                      <div className="sm:ml-auto">
                        {record.status ? (
                          <Badge tone={getAttendanceTone(record.status)}>
                            {record.status}
                          </Badge>
                        ) : (
                          <Badge tone="slate">Bilinmiyor</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}
