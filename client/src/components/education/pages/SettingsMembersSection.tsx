import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CredentialsPanel } from "@/components/credentials/CredentialsPanel";
import type { IssuedCredentials } from "@/components/credentials/IssuedCredentials";
import { MemberCreateDialog } from "./MemberCreateDialog";
import {
  loadOrganizationMembers,
  resetMemberPassword,
  type MemberStatus,
  type OrganizationMember,
} from "@/organization/memberService";
import { roleMeta } from "../roleMeta";
import { organizationMembers as demoMembers } from "../educationData";
import { Badge } from "../shared";

const STATUS_META: Record<
  MemberStatus,
  { label: string; tone: "green" | "amber" | "rose" }
> = {
  active: { label: "Aktif", tone: "green" },
  invited: { label: "Davet edildi", tone: "amber" },
  suspended: { label: "Askıda", tone: "rose" },
};

function getResetTargetLabel(member: OrganizationMember): string {
  if (member.displayName) {
    return `${member.displayName} için`;
  }
  if (member.loginNumber) {
    return `${member.loginNumber} numaralı üye için`;
  }
  return "Seçilen üye için";
}

function getResetTargetSubjectName(member: OrganizationMember): string {
  if (member.displayName) {
    return member.displayName;
  }
  if (member.loginNumber) {
    return `${member.loginNumber} Numaralı Üye`;
  }
  return "Kurum Üyesi";
}

export function SettingsMembersSection() {
  const { identity, demoMode } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>(
    demoMode ? demoMembers : []
  );
  const [loading, setLoading] = useState(!demoMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [resetTarget, setResetTarget] = useState<OrganizationMember | null>(
    null
  );
  const [resetView, setResetView] = useState<"confirm" | "credentials">(
    "confirm"
  );
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  /** Bkz. `MemberCreateDialog` — tekrar koruması bu `ref`e bağlı. */
  const resetIdempotencyKeyRef = useRef<string | null>(null);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(
    null
  );
  const [createOpen, setCreateOpen] = useState(false);
  // Liste birden fazla kez yenilenebiliyor: açılışta ve üye eklendikten sonra.
  // Geç dönen eski bir istek yeni listenin üzerine yazarsa, yöneticiye az önce
  // oluşturduğu üyeyi eksik gösterir ve aynı kişiyi ikinci kez açtırabilir.
  const reloadIdRef = useRef(0);

  const reloadMembers = useCallback(() => {
    if (demoMode) {
      setMembers(demoMembers);
      setLoading(false);
      return;
    }

    const organizationId = identity?.membership?.organizationId;
    const organizationCode = identity?.membership?.organizationCode ?? null;

    if (!organizationId) {
      setLoading(false);
      return;
    }

    const reloadId = ++reloadIdRef.current;
    setLoading(true);
    setLoadError(null);

    void loadOrganizationMembers(organizationId, organizationCode)
      .then(data => {
        if (reloadId !== reloadIdRef.current) return;
        setMembers(data);
      })
      .catch(error => {
        if (reloadId !== reloadIdRef.current) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Üye listesi yüklenemedi. Lütfen tekrar deneyin."
        );
        setMembers([]);
      })
      .finally(() => {
        if (reloadId === reloadIdRef.current) setLoading(false);
      });
  }, [
    demoMode,
    identity?.membership?.organizationCode,
    identity?.membership?.organizationId,
  ]);

  useEffect(() => {
    reloadMembers();
  }, [reloadMembers]);

  const handleOpenReset = (member: OrganizationMember) => {
    setResetTarget(member);
    setResetView("confirm");
    setResetError(null);
    setCredentials(null);
  };

  const handleCloseReset = () => {
    if (resetSubmitting) {
      return;
    }
    setResetTarget(null);
    setResetView("confirm");
    setResetError(null);
    setCredentials(null);
  };

  const handleConfirmReset = async () => {
    if (!resetTarget || resetSubmitting) {
      return;
    }

    if (demoMode) {
      if (!resetTarget.loginNumber) {
        return;
      }
      setCredentials({
        loginNumber: resetTarget.loginNumber,
        temporaryPassword: "demo-" + Math.random().toString(36).substring(2, 8),
        passwordLockSet: true,
        auditWritten: true,
      });
      setResetView("credentials");
      return;
    }

    setResetSubmitting(true);
    setResetError(null);

    // İlk denemede üretilir, sonraki denemelerde AYNI kalır (v1.2-17).
    // Değişseydi, hata alıp tekrar basan yönetici ikinci bir şifre üretir ve
    // az önce kâğıda yazdığı fişi sessizce geçersiz kılardı.
    if (resetIdempotencyKeyRef.current === null) {
      resetIdempotencyKeyRef.current = crypto.randomUUID();
    }

    try {
      const result = await resetMemberPassword(
        resetTarget.membershipId,
        resetIdempotencyKeyRef.current ?? undefined
      );
      resetIdempotencyKeyRef.current = null;
      setCredentials(result);
      setResetView("credentials");
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : "Şifre sıfırlanamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[18px] font-extrabold text-slate-900">
            Kurum Üyeleri
          </h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Kurumunuza kayıtlı yöneticiler, öğretmenler, öğrenciler ve veliler.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-xl bg-slate-900 px-3.5 py-2 text-[12px] font-extrabold text-white transition hover:bg-slate-800 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
        >
          Üye ekle
        </button>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/50 p-8">
          <p className="text-[12px] font-medium text-slate-500">
            Üye listesi yükleniyor…
          </p>
        </div>
      ) : loadError ? (
        <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50 p-4 text-[12px] leading-5 text-rose-800">
          <p className="font-bold">Üye listesi alınamadı</p>
          <p className="mt-0.5 text-[11px] text-rose-700">{loadError}</p>
        </div>
      ) : members.length === 0 ? (
        <div className="mt-6 flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8">
          <p className="text-[12px] font-medium text-slate-500">
            Kurumda kayıtlı üye bulunamadı.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-[12px]">
            <thead className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-600">
              <tr>
                <th className="px-4 py-3">Ad Soyad</th>
                <th className="px-4 py-3">Giriş Numarası</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Şube</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.map(member => (
                <tr
                  key={member.membershipId}
                  className="transition hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 font-bold text-slate-900">
                    {member.displayName ? (
                      member.displayName
                    ) : (
                      <span className="font-sans font-normal italic text-slate-400">
                        adı okunamadı
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                    {member.loginNumber ? (
                      member.loginNumber
                    ) : (
                      <span className="font-sans italic text-slate-400">
                        numarası yok
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {roleMeta[member.role]?.label ?? member.role}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {member.branchName ?? (
                      <span className="italic text-slate-400">
                        Kurum geneli
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_META[member.status]?.tone ?? "slate"}>
                      {STATUS_META[member.status]?.label ?? member.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenReset(member)}
                      disabled={!member.loginNumber}
                      title={
                        member.loginNumber
                          ? undefined
                          : "Giriş numarası olmayan üyenin şifresi sıfırlanamaz"
                      }
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-700"
                    >
                      Şifre sıfırla
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetTarget ? (
        <Dialog
          open={Boolean(resetTarget)}
          onOpenChange={open => {
            if (!open) handleCloseReset();
          }}
        >
          <DialogContent className="sm:max-w-[520px]">
            {resetView === "credentials" && credentials ? (
              <>
                <DialogHeader>
                  <DialogTitle>Yeni şifre üretildi</DialogTitle>
                  <DialogDescription>
                    Üyenin giriş bilgileri aşağıda. Bu ekran bir kez gösterilir.
                  </DialogDescription>
                </DialogHeader>

                <CredentialsPanel
                  subjectLabel="Üye"
                  subjectName={getResetTargetSubjectName(resetTarget)}
                  credentials={credentials}
                  onDone={handleCloseReset}
                />
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Yeni geçici şifre üret</DialogTitle>
                  <DialogDescription>
                    {getResetTargetLabel(resetTarget)} yeni bir geçici şifre
                    üretilecek. Kişinin mevcut şifresi geçersiz olacak.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2 text-[12px] leading-5 text-muted-foreground">
                  <p>
                    Üyenin mevcut şifresi <strong>geçersiz olacak</strong>.
                    Halihazırda giriş yapabiliyorsa bu işlemi yapmayın.
                  </p>
                  <p>
                    İşlem kurum denetim kaydına yazılır ve kimin yaptığı
                    görünür. Şifrenin kendisi hiçbir yere kaydedilmez.
                  </p>

                  {resetError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] leading-5 text-rose-800">
                      <p className="font-bold">Şifre sıfırlanamadı</p>
                      <p className="mt-0.5 text-[11px] text-rose-700">
                        {resetError}
                      </p>
                    </div>
                  ) : null}
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleCloseReset}
                    disabled={resetSubmitting}
                    className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmReset()}
                    disabled={resetSubmitting}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
                  >
                    {resetSubmitting ? "Üretiliyor…" : "Yeni şifre üret"}
                  </button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      ) : null}

      <MemberCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={identity?.membership?.organizationId ?? ""}
        onDone={() => {
          setCreateOpen(false);
          reloadMembers();
        }}
      />
    </>
  );
}
