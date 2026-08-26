import { useEffect, useState } from "react";
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
import { CredentialsPanel } from "@/components/credentials/CredentialsPanel";
import type { IssuedCredentials } from "@/components/credentials/IssuedCredentials";
import { useAuth } from "@/auth/useAuth";
import {
  createMember,
  loadOrganizationBranches,
  type MemberRole,
} from "@/organization/memberService";
import { roleMeta } from "../roleMeta";

type Branch = { id: string; name: string };

const MEMBER_ROLES: MemberRole[] = ["teacher", "student", "parent"];

export function MemberCreateDialog({
  open,
  onOpenChange,
  onDone,
  organizationId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  organizationId: string;
}) {
  const { demoMode } = useAuth();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<MemberRole>("teacher");
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(
    null
  );

  useEffect(() => {
    if (!open || demoMode) {
      return;
    }

    let active = true;
    setBranchLoading(true);
    setBranchError(null);

    void loadOrganizationBranches(organizationId)
      .then(data => {
        if (!active) {
          return;
        }
        setBranches(data);
      })
      .catch(loadError => {
        if (!active) {
          return;
        }
        setBranches([]);
        setBranchError(
          loadError instanceof Error
            ? loadError.message
            : "Şubeler yüklenemedi. Lütfen tekrar deneyin."
        );
      })
      .finally(() => {
        if (active) setBranchLoading(false);
      });

    return () => {
      active = false;
    };
  }, [demoMode, open, organizationId]);

  const reset = () => {
    setFullName("");
    setRole("teacher");
    setBranchId(null);
    setBranches([]);
    setBranchError(null);
    setError(null);
    setCredentials(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) {
      return;
    }
    if (!next) {
      reset();
    }
    onOpenChange(next);
  };

  const validationError =
    fullName.trim().length < 2 ? "Ad-soyad en az iki karakter olmalı." : null;

  const handleSubmit = async () => {
    if (validationError || submitting || branchError || branchLoading) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = demoMode
        ? {
            loginNumber: "demo-" + Date.now().toString().slice(-4),
            temporaryPassword:
              "demo-" + Math.random().toString(36).substring(2, 8),
            passwordLockSet: true,
            auditWritten: true,
          }
        : await createMember({
            fullName: fullName.trim(),
            role,
            branchId,
          });

      setCredentials(result);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Üye oluşturulamadı. Lütfen tekrar deneyin."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (credentials) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Üye oluşturuldu</DialogTitle>
            <DialogDescription>
              Üyenin giriş bilgileri aşağıda. Bu ekran bir kez gösterilir.
            </DialogDescription>
          </DialogHeader>
          <CredentialsPanel
            subjectLabel="Üye"
            subjectName={fullName.trim()}
            credentials={credentials}
            onDone={() => {
              reset();
              onDone();
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
          <DialogTitle>Yeni üye ekle</DialogTitle>
          <DialogDescription>
            Öğretmen, öğrenci veya veli hesabı oluşturun. Giriş bilgileri işlem
            sonunda yalnızca bir kez gösterilir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="member-full-name">Ad-soyad</Label>
            <Input
              id="member-full-name"
              value={fullName}
              onChange={event => setFullName(event.target.value)}
              placeholder="Ad Soyad"
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="member-role">Rol</Label>
            <select
              id="member-role"
              value={role}
              onChange={event => setRole(event.target.value as MemberRole)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {MEMBER_ROLES.map(memberRole => (
                <option key={memberRole} value={memberRole}>
                  {roleMeta[memberRole].label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="member-branch">Şube</Label>
            <select
              id="member-branch"
              value={branchId ?? ""}
              onChange={event =>
                setBranchId(event.target.value ? event.target.value : null)
              }
              disabled={branchLoading || Boolean(branchError)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Kurum geneli</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            {branchLoading ? (
              <p className="text-[11px] text-muted-foreground">
                Şubeler yükleniyor…
              </p>
            ) : null}
            {branchError ? (
              <p className="text-[11px] font-bold text-rose-600">
                {branchError}
              </p>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] leading-5 text-rose-800">
              <p className="font-bold">Üye oluşturulamadı</p>
              <p className="mt-0.5 text-[11px] text-rose-700">{error}</p>
            </div>
          ) : null}
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
            onClick={() => void handleSubmit()}
            disabled={
              Boolean(validationError) ||
              submitting ||
              branchLoading ||
              Boolean(branchError)
            }
            title={validationError ?? undefined}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-extrabold text-white transition hover:bg-slate-800 disabled:opacity-40 dark:bg-sky-400 dark:text-slate-900 dark:hover:bg-sky-300"
          >
            {submitting ? "Oluşturuluyor…" : "Üyeyi oluştur"}
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
