import { useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import {
  loadOrganizationMembers,
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

export function SettingsMembersSection() {
  const { identity, demoMode } = useAuth();
  const [members, setMembers] = useState<OrganizationMember[]>(
    demoMode ? demoMembers : []
  );
  const [loading, setLoading] = useState(!demoMode);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
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

    let active = true;
    setLoading(true);
    setLoadError(null);

    void loadOrganizationMembers(organizationId, organizationCode)
      .then(data => {
        if (!active) return;
        setMembers(data);
      })
      .catch(error => {
        if (!active) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "Üye listesi yüklenemedi. Lütfen tekrar deneyin."
        );
        setMembers([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    demoMode,
    identity?.membership?.organizationId,
    identity?.membership?.organizationCode,
  ]);

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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
