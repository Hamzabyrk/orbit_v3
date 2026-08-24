import { Link, Redirect } from "wouter";
import { OrbitMark } from "@/components/OrbitMark";
import { PlatformShell } from "@/platform/PlatformShell";
import { useAuth } from "@/auth/useAuth";

export default function Platform() {
  const { identity, loading } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-200">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 p-2">
            <OrbitMark inverted className="h-full w-full object-contain" />
          </span>
          <p className="text-sm font-bold">Yetki doğrulanıyor…</p>
        </div>
      </main>
    );
  }

  if (!identity) {
    return <Redirect to="/" />;
  }

  // Yetki kontrolü sunucudadır: `platform_operators` üzerindeki RLS, operatör
  // olmayan kullanıcıya hiçbir satır göstermez ve panelin yapacağı her işlem
  // Edge Function üzerinden operatörlüğü yeniden doğrular. Buradaki kontrol
  // yalnızca kullanıcı deneyimi içindir, güvenlik sınırı değildir.
  if (!identity.platformOperator) {
    return (
      <PlatformShell
        title="Bu alana erişiminiz yok"
        description="Platform yönetimi yalnızca geliştirme ekibi içindir."
        footer={
          <Link href="/" className="font-bold text-sky-300">
            Kurum paneline dön
          </Link>
        }
      />
    );
  }

  return (
    <PlatformShell
      title={`Merhaba, ${identity.displayName}`}
      description="Platform yönetim paneli hazırlanıyor. Kurum oluşturma, operatör listesi ve platform denetim kaydı buraya gelecek."
      footer={
        identity.membership ? (
          <Link href="/" className="font-bold text-sky-300">
            Kurum paneline geç
          </Link>
        ) : null
      }
    >
      <dl className="grid gap-3 rounded-xl bg-white/[.04] p-4 text-[12px]">
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Platform yetkisi</dt>
          <dd className="font-bold">
            {identity.platformOperator.role === "owner" ? "Sahip" : "Operatör"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-slate-400">Kurum üyeliği</dt>
          <dd className="font-bold">
            {identity.membership
              ? identity.membership.organizationName
              : "Yok — kurum içeriğine erişimi bulunmuyor"}
          </dd>
        </div>
      </dl>
    </PlatformShell>
  );
}
