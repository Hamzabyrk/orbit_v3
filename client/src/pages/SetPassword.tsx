import { OrbitMark } from "@/components/OrbitMark";
import { SetPasswordScreen } from "@/components/auth/SetPasswordScreen";
import { useAuth } from "@/auth/useAuth";

export default function SetPassword() {
  const {
    loading,
    passwordRecovery,
    completePasswordReset,
    cancelPasswordRecovery,
  } = useAuth();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#eef7ff]">
        <div className="flex items-center gap-3 text-slate-700">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 p-2">
            <OrbitMark inverted className="h-full w-full object-contain" />
          </span>
          <p className="text-sm font-bold">Bağlantı doğrulanıyor…</p>
        </div>
      </main>
    );
  }

  return (
    <SetPasswordScreen
      ready={passwordRecovery}
      onSubmit={completePasswordReset}
      onCancel={cancelPasswordRecovery}
    />
  );
}
