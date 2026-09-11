import { useState } from "react";
import { Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Badge,
  EmptyState,
  ErrorState,
  PageHeader,
  TableSkeleton,
} from "../shared";
import type { Role, Student } from "../types";
import type { OrganizationMember } from "@/organization/memberService";
import { formatTrDate } from "@/education/trDate";

export type StudentsPageProps = {
  // Zorunlu: bir rol kapısının varsayılanı olmaz. Opsiyonel olsaydı
  // varsayılanı en geniş yetki olurdu ve prop'u geçmeyi unutan bir çağrı
  // "Yeni öğrenci" düğmesini sessizce herkese açardı (K-04).
  role: Role;
  students: Student[];
  query: string;
  onQuery: (value: string) => void;
  onSelect: (student: Student) => void;
  onAdd: () => void;
  onEdit?: (student: Student) => void;
  onArchive?: (student: Student) => void | Promise<void>;
  onLinkAccount?: (
    studentId: string,
    membershipId: string
  ) => void | Promise<void>;
  onUnlinkAccount?: (studentId: string) => void | Promise<void>;
  linkableMembers?: OrganizationMember[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  truncated?: boolean;
  /** Üst sınırın tek kaynağı servistedir; bant onu tekrar etmez, gösterir (K-06). */
  limit?: number;
};

function LinkAccountPopover({
  student,
  members,
  onLink,
}: {
  student: Student;
  members: OrganizationMember[];
  onLink: (studentId: string, membershipId: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleLinkSubmit = async () => {
    if (!selectedMembershipId || linking) return;
    setLinking(true);
    setLinkError(null);
    try {
      await onLink(student.id, selectedMembershipId);
      setOpen(false);
      setSelectedMembershipId("");
    } catch (err) {
      setLinkError(
        err instanceof Error ? err.message : "Bağlama işlemi başarısız oldu."
      );
    } finally {
      setLinking(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-blue-600 transition hover:bg-blue-50"
        >
          Hesap bağla
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Hesap Bağla</h4>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {student.name} kaydına bağlanacak öğrenci hesabını seçin.
            </p>
          </div>
          {members.length === 0 ? (
            <p className="py-1 text-[11px] text-slate-500">
              Kurumda bağlanabilir öğrenci hesabı bulunmuyor.
            </p>
          ) : (
            <div className="space-y-2">
              <select
                value={selectedMembershipId}
                onChange={e => setSelectedMembershipId(e.target.value)}
                disabled={linking}
                className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none"
              >
                <option value="">Hesap seçin…</option>
                {members.map(m => (
                  <option key={m.membershipId} value={m.membershipId}>
                    {m.displayName || "İsimsiz"}{" "}
                    {m.loginNumber ? `(${m.loginNumber})` : ""}
                  </option>
                ))}
              </select>
              {linkError ? (
                <p className="text-[11px] font-semibold text-rose-600">
                  {linkError}
                </p>
              ) : null}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={linking}
                  className="rounded-md px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void handleLinkSubmit()}
                  disabled={!selectedMembershipId || linking}
                  className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {linking ? "Bağlanıyor…" : "Bağla"}
                </button>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StudentsPage({
  role,
  students: visibleStudents,
  query,
  onQuery,
  onSelect,
  onAdd,
  onEdit,
  onArchive,
  onLinkAccount,
  onUnlinkAccount,
  linkableMembers = [],
  isLoading = false,
  error = null,
  onRetry,
  truncated = false,
  limit,
}: StudentsPageProps) {
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const handleArchive = async (student: Student) => {
    if (!onArchive || archivingId) return;
    setArchivingId(student.id);
    try {
      await onArchive(student);
    } finally {
      setArchivingId(null);
    }
  };

  const handleUnlink = async (student: Student) => {
    if (!onUnlinkAccount || unlinkingId) return;
    setUnlinkingId(student.id);
    try {
      await onUnlinkAccount(student.id);
    } finally {
      setUnlinkingId(null);
    }
  };

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
            placeholder="Öğrenci adı veya numarası ara..."
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-9 pr-3 text-[12px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          />
        </div>
      </div>
      {truncated ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-[11px] font-semibold text-amber-800">
          Liste üst sınıra ({limit} kayıt) ulaştı. Kalan kayıtları görmek için
          yukarıdaki arama kutusunu kullanın.
        </div>
      ) : null}
      {isLoading ? (
        <TableSkeleton rows={5} columns={5} className="mt-5" />
      ) : error ? (
        <ErrorState
          className="mt-5"
          title="Öğrenciler görüntülenemedi"
          message={error.message}
          onRetry={onRetry}
        />
      ) : (
        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          {visibleStudents.length === 0 ? (
            <EmptyState
              title="Gösterilecek öğrenci yok"
              description={
                query
                  ? "Arama kriterlerine uygun öğrenci bulunamadı."
                  : "Henüz kayıtlı öğrenci bulunmuyor."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
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
                            <div className="flex items-center gap-2">
                              <p className="font-extrabold text-slate-800">
                                {student.name}
                              </p>
                              {/* K-22: Hesabı olmayan öğrenci kırmızı değil slate rozet taşır */}
                              {student.hasAccount === false ? (
                                <Badge tone="slate">Hesap bağlı değil</Badge>
                              ) : null}
                            </div>
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
                      <td className="px-5 py-4">
                        {student.score !== undefined ? (
                          <div>
                            <span className="font-extrabold text-slate-800">
                              {student.latestExamMaxScore !== null &&
                              student.latestExamMaxScore !== undefined
                                ? `${student.score} / ${student.latestExamMaxScore}`
                                : `${student.score} puan`}
                            </span>
                            {student.latestExamName ||
                            student.latestExamDate ? (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {[
                                  student.latestExamName,
                                  formatTrDate(student.latestExamDate),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        {student.risk ? (
                          <Badge
                            tone={
                              student.risk === "Takip gerekli"
                                ? "amber"
                                : "green"
                            }
                          >
                            {student.risk}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {role === "admin" ? (
                            <>
                              {student.hasAccount ? (
                                onUnlinkAccount ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleUnlink(student)}
                                    disabled={unlinkingId === student.id}
                                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-amber-600 transition hover:bg-amber-50 disabled:opacity-50"
                                  >
                                    {unlinkingId === student.id
                                      ? "Çözülüyor…"
                                      : "Bağı çöz"}
                                  </button>
                                ) : null
                              ) : onLinkAccount ? (
                                <LinkAccountPopover
                                  student={student}
                                  members={linkableMembers}
                                  onLink={onLinkAccount}
                                />
                              ) : null}
                              {onEdit ? (
                                <button
                                  type="button"
                                  onClick={() => onEdit(student)}
                                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100"
                                >
                                  Düzenle
                                </button>
                              ) : null}
                              {onArchive ? (
                                <button
                                  type="button"
                                  onClick={() => void handleArchive(student)}
                                  disabled={archivingId === student.id}
                                  className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                >
                                  {archivingId === student.id
                                    ? "Arşivleniyor…"
                                    : "Arşivle"}
                                </button>
                              ) : null}
                            </>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onSelect(student)}
                            className="rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50"
                          >
                            Profili aç
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </>
  );
}
