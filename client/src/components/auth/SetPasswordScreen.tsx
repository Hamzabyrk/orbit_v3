import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import { Check, ChevronRight, Eye, EyeOff, X } from "lucide-react";
import { evaluatePassword, findPasswordProblem } from "@/auth/passwordPolicy";
import {
  AuthField,
  AuthShell,
  authButtonClassName,
  authInputClassName,
} from "./AuthShell";

export function SetPasswordScreen({
  onSubmit,
  onCancel,
  ready,
}: {
  onSubmit: (password: string) => Promise<void>;
  onCancel: () => Promise<void>;
  /**
   * Geçerli bir şifre sıfırlama oturumu var mı. `false` ise bağlantı geçersiz,
   * süresi dolmuş veya kullanıcı bu adrese doğrudan gelmiştir.
   */
  ready: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = useMemo(() => evaluatePassword(password), [password]);

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
      setDone(true);
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

  if (done) {
    return (
      <AuthShell
        title="Şifreniz belirlendi"
        description="Güvenlik için oturumunuz kapatıldı. Yeni şifrenizle giriş yaparak devam edebilirsiniz."
        footer={
          <Link href="/" className="font-bold text-blue-600">
            Giriş ekranına git
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-[12px] leading-5 text-emerald-900">
            Yeni şifreniz kaydedildi. Bir sonraki adımda giriş yaparak şifrenin
            çalıştığını doğrulamış olacaksınız.
          </p>
        </div>
      </AuthShell>
    );
  }

  if (!ready) {
    return (
      <AuthShell
        title="Bağlantı geçerli değil"
        description="Şifre belirleme bağlantısı geçersiz veya süresi dolmuş görünüyor."
        footer={
          <Link href="/sifre-sifirla" className="font-bold text-blue-600">
            Yeni bağlantı iste
          </Link>
        }
      >
        <p className="rounded-xl bg-slate-50 p-4 text-[12px] leading-5 text-slate-600">
          Bu sayfaya yalnızca e-postanıza gönderilen bağlantı üzerinden
          ulaşabilirsiniz. Bağlantılar kısa süre için geçerlidir; süresi
          dolduysa yeni bir tane isteyebilirsiniz.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Yeni şifrenizi belirleyin"
      description="Hesabınız için kalıcı bir şifre oluşturun. Bundan sonra e-posta ve şifrenizle giriş yapacaksınız."
      footer={
        <button
          type="button"
          onClick={() => void onCancel()}
          className="font-bold text-slate-500 hover:text-slate-700"
        >
          Vazgeç ve çıkış yap
        </button>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <AuthField label="Yeni şifre">
          <div className="relative">
            <input
              value={password}
              onChange={event => setPassword(event.target.value)}
              type={passwordVisible ? "text" : "password"}
              required
              autoComplete="new-password"
              className={`${authInputClassName} pr-12`}
            />
            <button
              type="button"
              aria-label={passwordVisible ? "Şifreyi gizle" : "Şifreyi göster"}
              onClick={() => setPasswordVisible(value => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {passwordVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </AuthField>

        <AuthField label="Yeni şifre (tekrar)">
          <div className="relative">
            <input
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              type={confirmationVisible ? "text" : "password"}
              required
              autoComplete="new-password"
              className={`${authInputClassName} pr-12`}
            />
            <button
              type="button"
              aria-label={
                confirmationVisible ? "Şifreyi gizle" : "Şifreyi göster"
              }
              onClick={() => setConfirmationVisible(value => !value)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {confirmationVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
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
