import type { ReactNode } from "react";
import type { EducationRole } from "@/components/educationAccess";

export type AuthIdentity = {
  userId: string;
  membershipId: string;
  role: EducationRole;
  displayName: string;
  organizationId: string;
  organizationName: string;
  branchId: string | null;
  branchName: string | null;
  demo: boolean;
};

export type LoginInput = {
  email: string;
  password: string;
  demoRole: EducationRole;
};

export type AuthContextValue = {
  identity: AuthIdentity | null;
  loading: boolean;
  demoMode: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  switchDemoRole: (role: EducationRole) => void;
};

export type AuthProviderProps = {
  children: ReactNode;
};
