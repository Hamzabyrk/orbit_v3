import { OrbitMark } from "@/components/OrbitMark";
import { EducationLoginScreen } from "@/components/education/LoginScreen";
import { EducationPlatform } from "@/components/education/EducationPlatform";
import { useAuth } from "@/auth/useAuth";
import { toast } from "sonner";

export default function Home() {
  const { identity, loading, demoMode, signIn, signOut, switchDemoRole } =
    useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      toast.error("Oturum kapatılamadı", {
        description:
          error instanceof Error
            ? error.message
            : "Lütfen bağlantınızı kontrol edip tekrar deneyin.",
      });
    }
  };

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef7ff]">
        <div className="flex items-center gap-3 text-slate-700">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 p-2">
            <OrbitMark inverted className="h-full w-full object-contain" />
          </span>
          <p className="text-sm font-bold">Güvenli oturum yükleniyor…</p>
        </div>
      </main>
    );
  }

  if (!identity) {
    return <EducationLoginScreen demoMode={demoMode} onLogin={signIn} />;
  }

  return (
    <EducationPlatform
      initialRole={identity.role}
      displayName={identity.displayName}
      organizationName={identity.organizationName}
      branchName={identity.branchName}
      canSwitchRole={demoMode}
      onRoleChange={switchDemoRole}
      onLogout={handleLogout}
    />
  );
}
