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
import { CredentialsPanel } from "./CredentialsPanel";
import {
  resetAdminPassword,
  type OrganizationCredentials,
  type PlatformOrganization,
} from "./platformService";

/**
 * Kurum yöneticisine yeni geçici şifre üretir.
 *
 * Kurtarma zincirinin son halkası. İlk panel denemesinde bu işlem yoktu ve
 * kaybolan bir geçici şifre kurumu erişilemez kıldı; tek çare yeni bir kurum
 * açmaktı. Bkz. `.ai/DECISION_LOG.md` — "Operatör desteği üç katmanlıdır".
 */
export function AdminPasswordResetDialog({
  organization,
  onClose,
}: {
  organization: PlatformOrganization | null;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [credentials, setCredentials] =
    useState<OrganizationCredentials | null>(null);

  // Farklı bir kurum seçildiğinde önceki sonucun ekranda kalmaması gerekiyor;
  // kalsaydı operatör yanlış kurumun şifresini dağıtabilirdi.
  useEffect(() => {
    if (organization) setCredentials(null);
  }, [organization]);

  const handleOpenChange = (next: boolean) => {
    if (submitting || next) return;
    setCredentials(null);
    onClose();
  };

  const handleReset = async () => {
    if (!organization || submitting) return;

    setSubmitting(true);

    try {
      setCredentials(await resetAdminPassword(organization.id));
    } catch (error) {
      toast.error("Şifre üretilemedi", {
        description:
          error instanceof Error ? error.message : "Lütfen tekrar deneyin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!organization) {
    return null;
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {credentials ? "Yeni şifre üretildi" : "Yeni geçici şifre üret"}
          </DialogTitle>
          <DialogDescription>
            {credentials
              ? "Bu ekran bir kez gösterilir."
              : `${organization.name} kurumunun yöneticisi için yeni bir geçici şifre üretilecek.`}
          </DialogDescription>
        </DialogHeader>

        {credentials ? (
          <CredentialsPanel
            organizationName={organization.name}
            credentials={credentials}
            onDone={() => {
              setCredentials(null);
              onClose();
            }}
          />
        ) : (
          <>
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
                onClick={() => handleOpenChange(false)}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground transition hover:bg-muted disabled:opacity-50"
              >
                Vazgeç
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
        )}
      </DialogContent>
    </Dialog>
  );
}
