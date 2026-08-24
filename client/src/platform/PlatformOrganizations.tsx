import { useState } from "react";
import { PlatformEmptyState, PlatformSection } from "./PlatformShell";
import { OrganizationCreateDialog } from "./OrganizationCreateDialog";
import { AdminPasswordResetDialog } from "./AdminPasswordResetDialog";
import type { PlatformOrganization } from "./platformService";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function PlatformOrganizations({
  organizations,
  onCreated,
}: {
  organizations: PlatformOrganization[];
  onCreated: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  // Doluysa o kurumun yöneticisi için şifre üretme diyaloğu açılır.
  const [resetTarget, setResetTarget] = useState<PlatformOrganization | null>(
    null
  );

  return (
    <PlatformSection
      title="Kurumlar"
      description="Platform üzerinde kayıtlı dershaneler. Kurumun içeriği burada görünmez; yalnızca kabı yönetilir."
      action={
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="rounded-xl bg-sky-400 px-4 py-2.5 text-[12px] font-extrabold text-slate-900 transition hover:bg-sky-300"
        >
          Yeni kurum oluştur
        </button>
      }
    >
      {organizations.length === 0 ? (
        <PlatformEmptyState
          title="Henüz kurum yok"
          description="İlk kurumu oluşturduğunuzda kurum kodu otomatik atanır ve yöneticinin giriş numarası ile geçici şifresi bir kez gösterilir."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12px]">
            <thead>
              <tr className="bg-white/[.04] text-[10px] uppercase tracking-[.12em] text-slate-400">
                <th className="px-4 py-3 font-bold">Kod</th>
                <th className="px-4 py-3 font-bold">Kurum</th>
                <th className="px-4 py-3 font-bold">Kısa ad</th>
                <th className="px-4 py-3 font-bold">Kuruluş</th>
                <th className="px-4 py-3 font-bold">Durum</th>
                <th className="px-4 py-3 font-bold">Yönetici</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map(organization => (
                <tr
                  key={organization.id}
                  className="border-t border-white/[.06]"
                >
                  <td className="px-4 py-3 font-mono font-bold text-sky-300">
                    {organization.code ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-bold">{organization.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-400">
                    {organization.slug}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(organization.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {organization.archivedAt ? (
                      <span className="rounded-md bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-300">
                        Arşivlendi
                      </span>
                    ) : (
                      <span className="rounded-md bg-emerald-400/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        Aktif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setResetTarget(organization)}
                      className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Yeni şifre üret
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-5 text-slate-500">
        Kurum kodu giriş numarasının ilk dört hanesidir. Kurumun kullanıcıları
        <span className="font-mono"> {"<kurum><kişi>"} </span>
        biçiminde sekiz haneli numarayla giriş yapar.
      </p>

      <OrganizationCreateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={onCreated}
      />

      <AdminPasswordResetDialog
        organization={resetTarget}
        onClose={() => setResetTarget(null)}
      />
    </PlatformSection>
  );
}
