import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Check, ChevronRight, X } from "lucide-react";
import { evaluatePassword, findPasswordProblem } from "@/auth/passwordPolicy";
import {
  AuthField,
  AuthShell,
  authButtonClassName,
  authInputClassName,
} from "./AuthShell";

export function ForcePasswordChangeScreen({
  displayName,
  expiresAt,
  onSubmit,
  onSignOut,
}: {
  /** Kullanıcının görünen adı. Selamlama için. */
  displayName: string;
  /** Geçici şifrenin son geçerlilik anı (ISO). Yoksa süre bilgisi gösterilmez. */
  expiresAt: string | null;
  /** Yeni şifreyi kaydeder. Hata fırlatırsa mesajı ekranda göster. */
  onSubmit: (newPassword: string) => Promise<void>;
  /** Kullanıcı vazgeçip çıkmak isterse. */
  onSignOut: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = useMemo(() => evaluatePassword(password), [password]);
  const expirationTime = expiresAt ? new Date(expiresAt).getTime() : null;
  const remainingMilliseconds =
    expirationTime !== null && Number.isFinite(expirationTime)
      ? expirationTime - Date.now()
      : null;
  const expired = remainingMilliseconds !== null && remainingMilliseconds <= 0;
  const remainingTime =
    remainingMilliseconds === null
      ? null
      : remainingMilliseconds >= 86_400_000
        ? `${Math.floor(remainingMilliseconds / 86_400_000)} gün`
        : remainingMilliseconds >= 3_600_000
          ? `yaklaşık ${Math.floor(remainingMilliseconds / 3_600_000)} saat`
          : // Cümle kalıbı "{değer} sonra geçersiz olacak" biçiminde; "1 saatten
            // az sonra" bozuk Türkçe olurdu.
            "1 saatten kısa süre";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const problem = findPasswordProblem(password, confirmation);
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await onSubmit(password);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Şifre güncellenemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <button
      type="button"
      onClick={onSignOut}
      className="font-bold text-slate-500 hover:text-slate-700"
    >
      Çıkış yap
    </button>
  );

  if (expired) {
    return (
      <AuthShell
        title="Geçici şifrenizin süresi doldu"
        description="Bu şifreyle devam edemezsiniz. Yeni bir geçici şifre için kurum yöneticinize başvurun."
        footer={footer}
      >
        <p className="rounded-xl bg-rose-50 p-4 text-[12px] leading-5 text-rose-700">
          Merhaba {displayName}, geçici şifreniz artık geçerli değil.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Yeni şifrenizi belirleyin"
      description="Geçici şifrenizi değiştirmeniz gerekiyor. Bu işlemi bir kez tamamladıktan sonra yeni şifrenizle devam edebilirsiniz."
      footer={footer}
    >
      <p className="mb-5 text-[13px] font-bold text-slate-700">
        Merhaba {displayName}
      </p>

      {remainingTime ? (
        <p className="mb-5 rounded-xl bg-amber-50 p-3 text-[12px] leading-5 text-amber-900">
          Geçici şifreniz {remainingTime} sonra geçersiz olacak.
        </p>
      ) : null}

      <form onSubmit={submit} className="space-y-3">
        <AuthField label="Yeni şifre">
          <input
            value={password}
            onChange={event => setPassword(event.target.value)}
            type="password"
            required
            autoComplete="new-password"
            className={authInputClassName}
          />
        </AuthField>

        <AuthField label="Yeni şifre (tekrar)">
          <input
            value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
            type="password"
            required
            autoComplete="new-password"
            className={authInputClassName}
          />
        </AuthField>

        <ul className="space-y-1.5 rounded-xl bg-slate-50 p-3">
          {rules.map(rule => (
            <li
              key={rule.id}
              className={`flex items-center gap-2 text-[11px] ${rule.satisfied ? "text-emerald-700" : "text-slate-500"}`}
            >
              {rule.satisfied ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <X className="h-3.5 w-3.5 shrink-0 text-slate-300" />
              )}
              {rule.label}
            </li>
          ))}
        </ul>

        {error ? (
          <p className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        <button disabled={loading} className={authButtonClassName}>
          {loading ? "Kaydediliyor" : "Şifreyi kaydet"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}
