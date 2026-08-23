import { ForgotPasswordScreen } from "@/components/auth/ForgotPasswordScreen";
import { useAuth } from "@/auth/useAuth";

export default function ForgotPassword() {
  const { requestPasswordReset, demoMode } = useAuth();

  return (
    <ForgotPasswordScreen
      onRequest={requestPasswordReset}
      demoMode={demoMode}
    />
  );
}
