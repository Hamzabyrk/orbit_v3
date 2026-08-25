import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "wouter";
import { ChevronRight, MailCheck } from "lucide-react";
import {
  AuthField,
  AuthShell,
  authButtonClassName,
  authInputClassName,
} from "./AuthShell";

export function ForgotPasswordScreen({
  onRequest,
  demoMode,
}: {
  onRequest: (email: string) => Promise<void>;
  demoMode: boolean;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onRequest(email);
      setSent(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Şifre sıfırlama e-postası gönderilemedi."
      );
    } finally {
      setLoading(false);
    }
  };

  if (demoMode) {
    return (
      <AuthShell
        title="Şifre sıfırlama"
        description="Bu ekran yalnızca canlı ortamda çalışır. Demo modunda tüm hesaplar demo123 şifresini kullanır."
        footer={
          <Link href="/" className="font-bold text-blue-600">
            Giriş ekranına dön
          </Link>
        }
      >
        <p className="rounded-xl bg-slate-50 p-4 text-[12px] leading-5 text-slate-600">
          Yerel geliştirme ve önizleme derlemeleri demo modundadır; kimlik
          doğrulama sunucusuna bağlanmaz.
        </p>
      </AuthShell>
    );
  }

  if (sent) {
    return (
      <AuthShell
        title="E-postanızı kontrol edin"
        description="Girdiğiniz adres sistemde kayıtlıysa, şifre belirleme bağlantısı gönderildi."
        footer={
          <Link href="/" className="font-bold text-blue-600">
            Giriş ekranına dön
          </Link>
        }
      >
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-[12px] leading-5 text-emerald-900">
            <p className="font-bold">Bağlantı gönderildi</p>
            <p className="mt-1 text-emerald-800">
              Bağlantı kısa süre için geçerlidir. E-postayı göremiyorsanız
              gereksiz klasörünü kontrol edin.
            </p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Şifrenizi mi unuttunuz?"
      description="Kurum hesabınızın e-posta adresini girin. Şifrenizi belirleyebilmeniz için bir bağlantı gönderelim. Hesabınıza kayıtlı bir e-posta adresi yoksa şifrenizi buradan sıfırlayamazsınız; kurum yöneticinize başvurun."
      footer={
        <Link href="/" className="font-bold text-blue-600">
          Giriş ekranına dön
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        <AuthField label="E-posta adresi">
          <input
            value={email}
            onChange={event => setEmail(event.target.value)}
            type="email"
            required
            autoComplete="email"
            className={authInputClassName}
          />
        </AuthField>

        {error ? (
          <p className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        <button disabled={loading} className={authButtonClassName}>
          {loading ? "Gönderiliyor" : "Sıfırlama bağlantısı gönder"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </form>
    </AuthShell>
  );
}
