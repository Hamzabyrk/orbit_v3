import { useState } from "react";
import { EducationLoginScreen, EducationPlatform } from "@/components/EducationPlatform";
import type { EducationRole } from "@/components/educationAccess";

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [educationRole, setEducationRole] = useState<EducationRole>("admin");

  const handleLogin = (role: EducationRole) => {
    setEducationRole(role);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <EducationLoginScreen onLogin={handleLogin} />;
  }

  return <EducationPlatform initialRole={educationRole} onLogout={handleLogout} />;
}
