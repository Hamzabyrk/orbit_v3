import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CredentialsPanel } from "./CredentialsPanel";
import {
  deleteOrganization,
  resetAdminPassword,
  type OrganizationCredentials,
  type PlatformOrganization,
} from "./platformService";

/**
 * Kurum profili — yönetim işlemlerinin tek kapısı.
 *
 * İşlemler doğrudan listede durmuyor. Liste satırındaki bir düğme yanlışlıkla
 * tıklanmaya çok açık ve buradaki iki işlem de geri alınamaz sonuçlar
 * doğuruyor: biri mevcut şifreyi geçersiz kılıyor, diğeri kurumu tamamen yok
 * ediyor. Ara bir ekran, her ikisini de kasıtlı bir eylem hâline getiriyor.
 */
type View = "overview" | "reset-confirm" | "credentials" | "delete-confirm";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrganizationProfileDialog({
  organization,
  onClose,
  onChanged,
}: {
  organization: PlatformOrganization | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>("overview");
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] =
    useState<OrganizationCredentials | null>(null);
  const [confirmName, setConfirmName] = useState("");

  // Farklı bir kuruma geçildiğinde her şey sıfırlanmalı; kalsaydı operatör
  // bir kurumun ekranında başka kurumun şifresini görebilirdi.
  useEffect(() => {
    if (organization) {
      setView("overview");
      setCredentials(null);
      setConfirmName("");
    }
  }, [organization]);

  if (!organization) {
    return null;
  }

  const close = () => {
    if (submitting) return;
    onClose();
  };

  const handleReset = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      setCredentials(await resetAdminPassword(organization.id));
      setView("credentials");
    } catch (error) {
      toast.error("Şifre üretilemedi", {
        description:
          error instanceof Error ? error.message : "Lütfen tekrar deneyin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await deleteOrganization(organization.id, confirmName);

      toast.success("Kurum silindi", {
        description: `${result.organizationName} ve bağlı ${result.deletedMemberships} üyelik, ${result.deletedBranches} şube kaydı kaldırıldı.`,
      });

      if (result.protectedOperators > 0) {
        // Sessiz kalmamalı: operatör "tüm kullanıcılar silindi" sanıp
        // korunmuş bir hesabın varlığından habersiz kalmasın.
        toast.info("Platform operatörü hesapları korundu", {
          description: `${result.protectedOperators} üyenin hesabı silinmedi çünkü platform operatörü. Kurum üyelikleri kaldırıldı.`,
        });
      }

      if (result.orphanedUsers > 0) {
        // Sessizce geçilmemeli: veritabanı temiz ama auth tarafında artık
        // hesaplar kaldı. Giriş yapsalar bile üyeliksiz oldukları için dışarı
        // atılırlar, yine de bilinmesi gerekir.
        toast.warning("Bazı hesaplar silinemedi", {
          description: `${result.orphanedUsers} kullanıcı hesabı kaldırılamadı. Geliştirme ekibine bildirin.`,
        });
      }

      onChanged();
      onClose();
    } catch (error) {
      toast.error("Kurum silinemedi", {
        description:
          error instanceof Error ? error.message : "Lütfen tekrar deneyin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const nameMatches = confirmName.trim() === organization.name.trim();

  return (
    <Dialog open onOpenChange={next => (next ? undefined : close())}>
      <DialogContent className="sm:max-w-[520px]">
        {view === "credentials" && credentials ? (
          <>
            <DialogHeader>
              <DialogTitle>Yeni şifre üretildi</DialogTitle>
              <DialogDescription>
                Bu ekran bir kez gösterilir.
              </DialogDescription>
            </DialogHeader>

            <CredentialsPanel
              organizationName={organization.name}
              credentials={credentials}
              onDone={() => {
                setCredentials(null);
                onClose();
              }}
            />
          </>
        ) : view === "reset-confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Yeni geçici şifre üret</DialogTitle>
              <DialogDescription>
                {organization.name} kurumunun yöneticisi için yeni bir geçici
                şifre üretilecek.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-[12px] leading-5 text-muted-foreground">
              <p>
                Yöneticinin mevcut şifresi <strong>geçersiz olacak</strong>.
                Halihazırda giriş yapabiliyorsa bu işlemi yapmayın.
              </p>
              <p>
                İşlem denetim kaydına yazılır ve kimin yaptığı görünür. Şifrenin
                kendisi hiçbir yere kaydedilmez.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => setView("overview")}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
              >
                {submitting ? "Üretiliyor…" : "Yeni şifre üret"}
              </button>
            </DialogFooter>
          </>
        ) : view === "delete-confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Kurumu sil</DialogTitle>
              <DialogDescription>
                Bu işlem <strong>geri alınamaz</strong>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-[12px] leading-5">
              <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                <p className="font-bold">Silinecekler</p>
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  <li>Kurum kaydı ve şubeleri</li>
                  <li>Kullanıcı hesapları ve üyelikleri</li>
                  <li>Kurumun kendi denetim kaydı</li>
                </ul>
                <p className="mt-2 text-[11px] opacity-90">
                  Platform operatörü olan üyelerin hesapları{" "}
                  <strong>silinmez</strong>; yalnızca bu kurumla ilişkileri
                  kalkar.
                </p>
              </div>

              <p className="text-muted-foreground">
                Kurum kodu{" "}
                <span className="font-mono">{organization.code}</span> yeniden
                kullanılmaz. Silme işlemi platform denetim kaydına yazılır.
              </p>

              <div className="grid gap-2 pt-1">
                <Label htmlFor="confirm-name">
                  Onaylamak için kurum adını yazın
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmName}
                  onChange={event => setConfirmName(event.target.value)}
                  placeholder={organization.name}
                  autoComplete="off"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => setView("overview")}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Geri
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!nameMatches || submitting}
                title={nameMatches ? undefined : "Kurum adını birebir yazın"}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-rose-500 disabled:opacity-40"
              >
                {submitting ? "Siliniyor…" : "Kurumu kalıcı olarak sil"}
              </button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{organization.name}</DialogTitle>
              <DialogDescription>
                Kurum kabı yönetimi. İçeriği burada görünmez.
              </DialogDescription>
            </DialogHeader>

            <dl className="grid gap-3 rounded-xl bg-muted/60 p-4 text-[12px]">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Kurum kodu</dt>
                <dd className="font-mono font-bold">
                  {organization.code ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Kısa ad</dt>
                <dd className="font-mono">{organization.slug}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Kuruluş</dt>
                <dd>{formatDate(organization.createdAt)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Yönetici giriş no</dt>
                <dd className="font-mono font-bold">
                  {organization.code ? `${organization.code}1000` : "—"}
                </dd>
              </div>
            </dl>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => setView("reset-confirm")}
                className="w-full rounded-xl border border-border px-4 py-3 text-left text-[12px] transition hover:bg-muted"
              >
                <span className="font-bold">Yeni geçici şifre üret</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Yönetici şifresini kaybettiyse kullanın.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setView("delete-confirm")}
                className="w-full rounded-xl border border-rose-300 px-4 py-3 text-left text-[12px] text-rose-700 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <span className="font-bold">Kurumu sil</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  Kurum, kullanıcıları ve tüm kayıtları kalıcı olarak silinir.
                </span>
              </button>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={close}
                className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground transition hover:bg-muted"
              >
                Kapat
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
