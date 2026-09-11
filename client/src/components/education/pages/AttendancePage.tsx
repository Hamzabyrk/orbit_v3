import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { isDemoMode } from "@/auth/runtime";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  attendanceLessonInfo,
  students as defaultStudents,
} from "../educationData";
import {
  filterAttendanceStudents,
  filterClassesForRole,
} from "../scopeFilters";
import {
  Badge,
  CardSkeleton,
  EmptyState,
  ErrorState,
  PageHeader,
} from "../shared";
import type {
  AttendanceState,
  Role,
  Student,
  ClassGroup,
  Section,
} from "../types";
import {
  ATTENDANCE_STATES,
  getAttendanceTone,
  attendanceStateToDbStatus,
} from "@/education/attendanceStatus";
import type {
  AttendanceSessionDetail,
  AttendanceSheet,
  AttendanceEntryInput,
} from "@/education/attendanceService";
import {
  formatSessionTitle,
  formatSessionDateTime,
  openAttendanceSession,
  loadAttendanceSheet,
  saveAttendance,
  translateAttendanceError,
} from "@/education/attendanceService";

export function AttendancePage({
  role,
  attendances,
  setAttendances,
  students: studentList = defaultStudents,
  classes: classList = [],
  session,
  isLoading = false,
  error = null,
  onRetry,
  isDemo = isDemoMode,
  organizationId,
  onNavigate,
  onSaved,
  onDirtyChange,
  onRequestConfirm,
}: {
  role: Role;
  attendances: Record<string, AttendanceState>;
  setAttendances: React.Dispatch<
    React.SetStateAction<Record<string, AttendanceState>>
  >;
  students?: Student[];
  classes?: ClassGroup[];
  session?: AttendanceSessionDetail | null;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  isDemo?: boolean;
  organizationId?: string;
  onNavigate?: (section: Section) => void;
  onSaved?: () => Promise<void> | void;
  onDirtyChange?: (isDirty: boolean) => void;
  onRequestConfirm?: (action: () => void) => void;
}) {
  // Güvenlik kapısı (Bulgu 2): isDemo prop'u üretimde (isDemoMode === false) demoyu AÇAMAZ.
  // Prop yalnızca test ortamında veya demo modunda demoyu KAPATMAK (isDemo={false}) için kullanılabilir.
  const activeDemo = isDemoMode && isDemo;
  const states = ATTENDANCE_STATES;
  const demoSelected = filterAttendanceStudents(studentList, role, activeDemo);
  const availableClasses = filterClassesForRole(classList, role, activeDemo);

  // Canlı mod durumları (v1.4-03)
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isOpeningSession, setIsOpeningSession] = useState<boolean>(false);
  const [activeSheet, setActiveSheet] = useState<AttendanceSheet | null>(null);
  const [isSheetLoading, setIsSheetLoading] = useState<boolean>(false);
  const [sheetError, setSheetError] = useState<Error | null>(null);
  const [sheetStatuses, setSheetStatuses] = useState<
    Record<string, AttendanceState | null>
  >({});
  const [initialStatuses, setInitialStatuses] = useState<
    Record<string, AttendanceState | null>
  >({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Eğer dışarıdan hazır bir session prop'u geldiyse ve henüz aktif sheet açılmadıysa
  // session'daki mevcut durumları sheetStatuses'e yükle (testler ve geçmiş oturum görüntüleme için)
  useEffect(() => {
    if (!activeDemo && session && !activeSheet) {
      const map: Record<string, AttendanceState | null> = {};
      for (const rec of session.records) {
        map[rec.studentId] = rec.status ?? null;
      }
      setSheetStatuses(map);
      setInitialStatuses(map);
    }
  }, [activeDemo, session, activeSheet]);

  // Kaydedilmemiş değişiklik var mı?
  const isDirty = useMemo(() => {
    if (activeDemo) return false;
    return Object.keys(sheetStatuses).some(
      studentId => sheetStatuses[studentId] !== initialStatuses[studentId]
    );
  }, [activeDemo, sheetStatuses, initialStatuses]);

  // Kirli durumu yukarı bildir
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => {
      onDirtyChange?.(false);
    };
  }, [onDirtyChange]);

  // Sayfadan ayrılırken uyarı ver (kaydedilmemiş değişiklik varsa)
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const [sessionConfirmOpen, setSessionConfirmOpen] = useState(false);

  const executeOpenSession = async () => {
    if (!selectedClassId || !selectedDate) return;

    if (!organizationId) {
      toast.error("Kurum bilgisi eksik", {
        description:
          "Yoklama açabilmek için aktif bir kuruma bağlı olmalısınız.",
      });
      return;
    }

    setIsOpeningSession(true);
    setIsSheetLoading(true);
    setSheetError(null);
    try {
      const { id: sessionId } = await openAttendanceSession({
        organizationId,
        classId: selectedClassId,
        sessionDate: selectedDate,
      });

      setActiveSessionId(sessionId);

      const sheet = await loadAttendanceSheet(organizationId, sessionId);
      setActiveSheet(sheet);

      const statusMap: Record<string, AttendanceState | null> = {};
      for (const st of sheet.students) {
        // Varsayılan durum SEÇİLMEMİŞTİR (K-03: uydurulmuş değer yok)
        statusMap[st.studentId] = st.status ?? null;
      }
      setSheetStatuses(statusMap);
      setInitialStatuses(statusMap);
      onDirtyChange?.(false);
    } catch (err: unknown) {
      const message = translateAttendanceError(err);
      setSheetError(new Error(message));
      toast.error("Yoklama oturumu açılamadı", { description: message });
    } finally {
      setIsOpeningSession(false);
      setIsSheetLoading(false);
    }
  };

  // Sınıf seç → tarih seç → "Yoklama al" akışı
  const handleOpenSession = async () => {
    if (!selectedClassId || !selectedDate) return;

    if (isDirty) {
      if (onRequestConfirm) {
        onRequestConfirm(() => {
          void executeOpenSession();
        });
      } else {
        setSessionConfirmOpen(true);
      }
      return;
    }

    await executeOpenSession();
  };

  // Yoklamayı tek nefeste kaydet
  const handleSaveAttendance = async () => {
    const currentSessionId = activeSessionId || session?.id;
    if (!currentSessionId) return;

    const currentStudents = activeSheet
      ? activeSheet.students.map(s => ({ id: s.studentId }))
      : session
        ? session.records.map(r => ({ id: r.studentId }))
        : [];

    const entries: AttendanceEntryInput[] = [];
    for (const st of currentStudents) {
      const status = sheetStatuses[st.id];
      if (status) {
        const dbStatus = attendanceStateToDbStatus(status);
        if (dbStatus) {
          entries.push({
            student_id: st.id,
            status: dbStatus,
          });
        }
      }
    }

    setIsSaving(true);
    try {
      const count = await saveAttendance(currentSessionId, entries);
      toast.success("Yoklama kaydedildi", {
        description: `${count} öğrencinin yoklama durumu güncellendi.`,
      });
      setInitialStatuses({ ...sheetStatuses });
      onDirtyChange?.(false);
      if (onSaved) {
        await onSaved();
      }
    } catch (err: unknown) {
      const message = translateAttendanceError(err);
      toast.error("Yoklama kaydedilemedi", {
        description: message,
        action:
          onNavigate && message.includes("Sınıflar ekranından")
            ? {
                label: "Sınıflar'a git",
                onClick: () => onNavigate("Sınıflar"),
              }
            : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Aktif oturum başlığı ve öğrenci listesi belirleme
  const currentSheetOrSession = activeSheet || session;
  const currentTitle = activeDemo
    ? (attendanceLessonInfo?.groupTitle ?? "Yoklama Listesi")
    : activeSheet
      ? `${activeSheet.session.className || "Sınıf"} · ${formatSessionDateTime(
          activeSheet.session.sessionDate,
          activeSheet.session.startsAt
        )}`
      : session
        ? formatSessionTitle(session)
        : "";

  const currentStudentRows = activeSheet
    ? activeSheet.students.map(s => ({
        id: s.studentId,
        name: s.studentName,
        code: s.studentCode,
      }))
    : session
      ? session.records.map(r => {
          const studentObj = studentList.find(s => s.id === r.studentId);
          return {
            id: r.studentId,
            name: studentObj?.name || r.studentName,
            code: studentObj?.code,
          };
        })
      : [];

  return (
    <>
      <PageHeader
        eyebrow="Ders operasyonu"
        title="Yoklama"
        description={
          !activeDemo
            ? "Sınıf ve tarih seçerek yoklama alın veya mevcut oturumu güncelleyin."
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

      {/* CANLI MOD: Sınıf seç → Tarih seç → "Yoklama al" araç çubuğu */}
      {!activeDemo ? (
        <div className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-[11px] font-bold text-slate-600">
              Sınıf Seçin
            </label>
            <select
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
            >
              <option value="">Sınıf seçiniz...</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} {cls.branch ? `(${cls.branch})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[180px]">
            <label className="mb-1 block text-[11px] font-bold text-slate-600">
              Tarih
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] font-medium text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={handleOpenSession}
              disabled={!selectedClassId || !selectedDate || isOpeningSession}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-[13px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isOpeningSession ? "Açılıyor..." : "Yoklama al"}
            </button>
          </div>
        </div>
      ) : null}

      {isLoading || isSheetLoading ? (
        <CardSkeleton className="mt-6" />
      ) : error || sheetError ? (
        <ErrorState
          className="mt-6"
          title="Yoklama bilgileri görüntülenemedi"
          message={
            (error || sheetError)!.message ||
            "Yoklama bilgileri yüklenirken bir hata oluştu."
          }
          onRetry={onRetry}
        />
      ) : !activeDemo && !currentSheetOrSession ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <EmptyState
            title="Henüz yoklama kaydı yok"
            description="Kurumda kayıtlı bir yoklama oturumu bulunamadı. Yoklama almak için yukarıdan sınıf ve tarih seçip 'Yoklama al' butonuna tıklayın."
          />
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <p className="text-[12px] font-extrabold text-slate-800">
                {currentTitle}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {activeDemo
                  ? (attendanceLessonInfo?.groupDetail ??
                    `${demoSelected.length} kayıtlı öğrenci`)
                  : `${currentStudentRows.length} kayıtlı öğrenci`}
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
              // CANLI MOD: Öğretmen veya yönetici için interaktif yoklama listesi
              <>
                {currentStudentRows.length === 0 ? (
                  <EmptyState
                    title="Bu oturumda öğrenci kaydı yok"
                    description="Yoklama oturumuna ait sınıfta henüz kayıtlı öğrenci bulunamadı."
                  />
                ) : null}
                {currentStudentRows.map(student => {
                  const currentStatus = sheetStatuses[student.id] ?? null;

                  return (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                    >
                      <div className="flex min-w-[220px] items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-[11px] font-extrabold text-slate-600">
                          {student.name
                            .split(" ")
                            .filter(Boolean)
                            .map(word => word[0])
                            .join("")}
                        </span>
                        <div>
                          <p className="text-[12px] font-extrabold text-slate-800">
                            {student.name}
                          </p>
                          {student.code ? (
                            <p className="text-[10px] text-slate-400">
                              {student.code}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {states.map(state => {
                          const isSelected = currentStatus === state;
                          return (
                            <button
                              key={state}
                              type="button"
                              onClick={() => {
                                setSheetStatuses(prev => ({
                                  ...prev,
                                  [student.id]:
                                    prev[student.id] === state ? null : state,
                                }));
                              }}
                              className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${
                                isSelected
                                  ? "bg-slate-900 text-white shadow-sm"
                                  : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              {state}
                            </button>
                          );
                        })}
                      </div>
                      <div className="sm:ml-auto">
                        {currentStatus ? (
                          <Badge tone={getAttendanceTone(currentStatus)}>
                            {currentStatus}
                          </Badge>
                        ) : (
                          <Badge tone="slate">Seçilmedi</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* CANLI MOD: Altta tek "Yoklamayı kaydet" düğmesi */}
          {!activeDemo && currentStudentRows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50/50 px-5 py-4">
              <div className="text-[12px] text-slate-500">
                {isDirty ? (
                  <span className="font-medium text-amber-700">
                    ● Kaydedilmemiş değişiklikler var
                  </span>
                ) : (
                  <span>Tüm değişiklikler güncel</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "Kaydediliyor..." : "Yoklamayı kaydet"}
              </button>
            </div>
          ) : null}
        </section>
      )}
      <AlertDialog
        open={sessionConfirmOpen}
        onOpenChange={setSessionConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kaydedilmemiş Değişiklikler</AlertDialogTitle>
            <AlertDialogDescription>
              Kaydedilmemiş yoklama değişiklikleriniz var. Yeni bir oturum
              açarsanız bu değişiklikler kaybolacak. Devam etmek istediğinize
              emin misiniz?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionConfirmOpen(false)}>
              Vazgeç
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setSessionConfirmOpen(false);
                void executeOpenSession();
              }}
            >
              Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
