import { toast } from "sonner";
import { attendanceLessonInfo, students } from "../educationData";
import { Badge, EmptyState, PageHeader } from "../shared";
import type { AttendanceState, Role } from "../types";

export function AttendancePage({
  role,
  attendances,
  setAttendances,
}: {
  role: Role;
  attendances: Record<string, AttendanceState>;
  setAttendances: React.Dispatch<
    React.SetStateAction<Record<string, AttendanceState>>
  >;
}) {
  const states: AttendanceState[] = [
    "Katıldı",
    "Geç kaldı",
    "Gelmedi",
    "İzinli",
  ];
  const selected =
    role === "teacher"
      ? students.filter(
          student =>
            student.group === "YKS 12-A" || student.group === "YKS 11-C"
        )
      : students;
  const tone = (status: AttendanceState) =>
    status === "Katıldı"
      ? "green"
      : status === "Geç kaldı"
        ? "amber"
        : status === "Gelmedi"
          ? "rose"
          : "blue";
  return (
    <>
      <PageHeader
        eyebrow="Ders operasyonu"
        title="Yoklama"
        description={
          attendanceLessonInfo?.pageDescription ??
          "Ders yoklamasını tamamlayın ve kaydedin."
        }
        action="Yoklamayı kaydet"
        onAction={() => {
          toast.info("Yoklama kaydı henüz aktif değil", {
            description:
              "Yoklama altyapısı kalıcı veri fazında kurulacaktır; şu an bir kayıt oluşturulmadı.",
          });
        }}
      />
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-[12px] font-extrabold text-slate-800">
              {attendanceLessonInfo?.groupTitle ?? "Yoklama Listesi"}
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              {attendanceLessonInfo?.groupDetail ??
                `${selected.length} kayıtlı öğrenci`}
            </p>
          </div>
          <Badge tone="amber">Taslak</Badge>
        </div>
        <div className="divide-y divide-slate-100">
          {selected.length === 0 ? (
            <EmptyState
              title="Henüz öğrenci kaydı yok"
              description="Yoklama alabilmek için önce öğrenci eklenmesi gerekir."
            />
          ) : null}
          {selected.map(student => (
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
                  <p className="text-[10px] text-slate-400">{student.code}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {states.map(state => (
                  <button
                    key={state}
                    onClick={() => {
                      setAttendances(current => ({
                        ...current,
                        [student.id]: state,
                      }));
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold transition ${attendances[student.id] === state ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"}`}
                  >
                    {state}
                  </button>
                ))}
              </div>
              <div className="sm:ml-auto">
                <Badge tone={tone(attendances[student.id])}>
                  {attendances[student.id]}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
