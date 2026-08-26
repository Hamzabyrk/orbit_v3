import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { AuthShell, authButtonClassName } from "./AuthShell";

export function ProfileUnavailableScreen({
  onRetry,
  onSignOut,
}: {
  /** Profil bilgisini ve kimliği yeniden okur. Hata fırlatırsa mesajı ekranda gösterir. */
  onRetry: () => Promise<void>;
  /** Kullanıcı oturumu kapatıp çıkmak isterse. */
  onSignOut: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setError(null);
    setLoading(true);

    try {
      await onRetry();
    } catch (retryError) {
      setError(
        retryError instanceof Error
          ? retryError.message
          : "Bilgileriniz yüklenemedi. Lütfen tekrar deneyin."
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

  return (
    <AuthShell
      title="Bilgileriniz okunamadı"
      description="Kullanıcı bilgileriniz yüklenirken bir sorun oluştu. Bu genellikle geçici bir bağlantı durumudur; sorun devam ederse kurum yöneticinize başvurun."
      footer={footer}
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-xl bg-rose-50 p-3 text-[12px] leading-5 text-rose-700">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleRetry()}
          className={authButtonClassName}
        >
          {loading ? "Yeniden deneniyor…" : "Tekrar dene"}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </AuthShell>
  );
}
