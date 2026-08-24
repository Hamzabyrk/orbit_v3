import { useState } from "react";
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
import { CredentialsPanel } from "./CredentialsPanel";
import { Label } from "@/components/ui/label";
import {
  createOrganization,
  type OrganizationCredentials,
} from "./platformService";
import {
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from "./organizationSlug";

const DEFAULT_BRANCH_NAME = "Merkez";

type FormState = {
  organizationName: string;
  organizationSlug: string;
  branchName: string;
  adminFullName: string;
};

const EMPTY_FORM: FormState = {
  organizationName: "",
  organizationSlug: "",
  branchName: DEFAULT_BRANCH_NAME,
  adminFullName: "",
};

export function OrganizationCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // Operatör slug'a elle dokunduysa ad değişince üzerine yazmıyoruz; yazsaydık
  // düzeltmesi her tuş vuruşunda geri alınırdı.
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Doluysa diyalog forma değil, giriş bilgisi ekranına döner.
  const [credentials, setCredentials] = useState<
    (OrganizationCredentials & { organizationName: string }) | null
  >(null);

  const update = (patch: Partial<FormState>) =>
    setForm(current => ({ ...current, ...patch }));

  const handleNameChange = (value: string) => {
    update({
      organizationName: value,
      ...(slugEdited
        ? {}
        : { organizationSlug: slugifyOrganizationName(value) }),
    });
  };

  const reset = () => {
    setForm(EMPTY_FORM);
    setSlugEdited(false);
    setCredentials(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const validationError = ((): string | null => {
    if (form.organizationName.trim().length < 2) {
      return "Kurum adı en az iki karakter olmalı.";
    }

    if (!isValidOrganizationSlug(form.organizationSlug)) {
      return "Kısa ad yalnızca küçük harf, rakam ve tek tire içerebilir.";
    }

    if (form.branchName.trim().length < 2) {
      return "Şube adı en az iki karakter olmalı.";
    }

    if (form.adminFullName.trim().length < 2) {
      return "Yönetici adı en az iki karakter olmalı.";
    }

    return null;
  })();

  const handleSubmit = async () => {
    if (validationError || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await createOrganization({
        organizationName: form.organizationName.trim(),
        organizationSlug: form.organizationSlug.trim(),
        branchName: form.branchName.trim(),
        adminFullName: form.adminFullName.trim(),
      });

      // Diyalog KAPANMIYOR. Geçici şifre hiçbir yere kaydedilmediği için bu
      // ekran kapandığında bir daha görülemez; operatör bilgileri alana kadar
      // açık kalmak zorunda.
      setCredentials({
        ...result,
        organizationName: form.organizationName.trim(),
      });
      onCreated();
    } catch (error) {
      toast.error("Kurum oluşturulamadı", {
        description:
          error instanceof Error ? error.message : "Lütfen tekrar deneyin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (credentials) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Kurum oluşturuldu</DialogTitle>
            <DialogDescription>
              Kurum yöneticisinin giriş bilgileri aşağıda. Bu ekran bir kez
              gösterilir.
            </DialogDescription>
          </DialogHeader>

          <CredentialsPanel
            organizationName={credentials.organizationName}
            credentials={credentials}
            onDone={() => {
              reset();
              onOpenChange(false);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Yeni kurum oluştur</DialogTitle>
          <DialogDescription>
            Kurum, varsayılan şube ve kurum yöneticisi tek işlemde oluşturulur.
            Kurum kodu ve giriş numarası otomatik atanır.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="organization-name">Kurum adı</Label>
            <Input
              id="organization-name"
              value={form.organizationName}
              onChange={event => handleNameChange(event.target.value)}
              placeholder="Çorlu Işık Dershanesi"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="organization-slug">Kısa ad</Label>
            <Input
              id="organization-slug"
              value={form.organizationSlug}
              onChange={event => {
                setSlugEdited(true);
                update({ organizationSlug: event.target.value });
              }}
              placeholder="corlu-isik-dershanesi"
              autoComplete="off"
              className="font-mono"
            />
            <p className="text-[11px] leading-4 text-muted-foreground">
              Adres ve bağlantılarda kullanılır, sonradan değiştirilmesi
              önerilmez. Kurum adından otomatik üretilir.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="branch-name">Varsayılan şube</Label>
            <Input
              id="branch-name"
              value={form.branchName}
              onChange={event => update({ branchName: event.target.value })}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-name">Kurum yöneticisi</Label>
            <Input
              id="admin-name"
              value={form.adminFullName}
              onChange={event => update({ adminFullName: event.target.value })}
              placeholder="Ad Soyad"
              autoComplete="off"
            />
          </div>

          <p className="rounded-xl bg-muted/60 p-3 text-[11px] leading-5 text-muted-foreground">
            E-posta sorulmuyor. Kurum yöneticisi giriş numarası ve geçici
            şifreyle açılır; kendi e-postasını ilk girişte kendisi ekler ve
            doğrular. Bilgiler oluşturmadan hemen sonra bir kez gösterilir.
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
            onClick={handleSubmit}
            disabled={Boolean(validationError) || submitting}
            title={validationError ?? undefined}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            {submitting ? "Oluşturuluyor…" : "Kurumu oluştur"}
          </button>
        </DialogFooter>

        {validationError ? (
          <p className="-mt-1 text-right text-[11px] font-bold text-amber-600 dark:text-amber-400">
            {validationError}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
