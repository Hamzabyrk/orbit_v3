import * as React from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/auth/AuthContext";
import type { AuthContextValue } from "@/auth/types";
import type { EducationRole } from "@/components/educationAccess";
import {
  SettingsMembersSection,
  ChangeRoleDialog,
  RemoveMemberDialog,
} from "./SettingsMembersSection";
import type { OrganizationMember } from "@/organization/memberService";
import { translateMembershipActionError } from "@/organization/memberService";
import { useSettingsMembers } from "@/settings/settingsQueries";

(globalThis as unknown as { React: typeof React }).React = React;

vi.mock("@/settings/settingsQueries", () => ({
  useSettingsMembers: vi.fn(),
  useSettingsBranches: vi.fn().mockReturnValue({
    data: [],
    isLoading: false,
    error: null,
  }),
  settingsKeys: {
    members: (orgId: string) => ["settings", "members", orgId],
    all: ["settings"],
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children?: React.ReactNode;
    open?: boolean;
  }) =>
    createElement(
      "div",
      { "data-slot": "dialog", "data-open": open },
      open ? children : null
    ),
  DialogContent: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-content" }, children),
  DialogHeader: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-header" }, children),
  DialogTitle: ({ children }: { children?: React.ReactNode }) =>
    createElement("h2", { "data-slot": "dialog-title" }, children),
  DialogDescription: ({ children }: { children?: React.ReactNode }) =>
    createElement("p", { "data-slot": "dialog-description" }, children),
  DialogFooter: ({ children }: { children?: React.ReactNode }) =>
    createElement("div", { "data-slot": "dialog-footer" }, children),
}));

function renderWithAuth(
  ui: React.ReactElement,
  options?: {
    role?: EducationRole;
    userId?: string;
    membershipId?: string;
    orgId?: string;
  }
) {
  const queryClient = new QueryClient();
  const dummyAuth: AuthContextValue = {
    identity: {
      user: {
        id: options?.userId ?? "usr-admin",
        email: "admin@orbit.local",
        phone: null,
        created_at: "",
      },
      membership: {
        id: options?.membershipId ?? "mem-admin",
        membershipId: options?.membershipId ?? "mem-admin",
        role: options?.role ?? "admin",
        organizationId: options?.orgId ?? "org-1",
      },
    } as unknown as AuthContextValue["identity"],
    loading: false,
    demoMode: false,
    passwordRecovery: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    switchDemoRole: vi.fn(),
    requestPasswordReset: vi.fn(),
    completePasswordReset: vi.fn(),
    cancelPasswordRecovery: vi.fn(),
    completeRequiredPasswordChange: vi.fn(),
    refreshIdentity: vi.fn(),
  };

  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AuthContext.Provider, { value: dummyAuth }, ui)
    )
  );
}

const mockMembers: OrganizationMember[] = [
  {
    membershipId: "mem-admin",
    displayName: "Ali Yönetici",
    loginNumber: "10011000",
    role: "admin",
    branchName: null,
    status: "active",
  },
  {
    membershipId: "mem-teacher",
    displayName: "Ayşe Öğretmen",
    loginNumber: "10011001",
    role: "teacher",
    branchName: "Merkez",
    status: "active",
  },
  {
    membershipId: "mem-student",
    displayName: "Mehmet Öğrenci",
    loginNumber: "10011002",
    role: "student",
    branchName: "Merkez",
    status: "active",
    linkedPerson: { type: "student", id: "stu-1", name: "Mehmet Öğrenci" },
  },
  {
    membershipId: "mem-parent",
    displayName: "Fatma Veli",
    loginNumber: "10011003",
    role: "parent",
    branchName: "Merkez",
    status: "active",
    linkedPerson: { type: "guardian", id: "g-1", name: "Fatma Veli" },
  },
  {
    membershipId: "mem-suspended",
    displayName: "Kemal Yılmaz",
    loginNumber: "10011004",
    role: "teacher",
    branchName: null,
    status: "suspended",
  },
];

describe("SettingsMembersSection (v1.4-07 · #280)", () => {
  beforeEach(() => {
    vi.mocked(useSettingsMembers).mockReturnValue({
      data: mockMembers,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSettingsMembers>);
  });

  it("suspended üyelik listede görünmeye devam eder ve 'Askıda' rozeti çizilir (K-22)", () => {
    const html = renderWithAuth(createElement(SettingsMembersSection));

    expect(html).toContain("Kemal Yılmaz");
    expect(html).toContain("Askıda");
  });

  it("yönetici rolünde normal üye satırlarında 'Rol değiştir' ve 'Kurumdan çıkar' düğmeleri çizilir", () => {
    const html = renderWithAuth(createElement(SettingsMembersSection), {
      role: "admin",
      membershipId: "mem-other-admin",
    });

    expect(html).toContain("Rol değiştir");
    expect(html).toContain("Kurumdan çıkar");
  });

  it("hedef bir yönetici (admin) olduğunda rol değiştirme ve çıkarma eylemleri ÇİZİLMEZ (v1.4-08)", () => {
    // Yalnızca admin olan bir liste sunuyoruz
    vi.mocked(useSettingsMembers).mockReturnValue({
      data: [
        {
          membershipId: "mem-target-admin",
          displayName: "Başka Yönetici",
          loginNumber: "10019999",
          role: "admin",
          branchName: null,
          status: "active",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSettingsMembers>);

    const html = renderWithAuth(createElement(SettingsMembersSection), {
      role: "admin",
      membershipId: "mem-caller-admin",
    });

    expect(html).toContain("Başka Yönetici");
    // Admin hedefinde bu işlemler çizilmez
    expect(html).not.toContain("Rol değiştir");
    expect(html).not.toContain("Kurumdan çıkar");
  });

  it("kullanıcı kendi üyeliğini hedef aldığında rol değiştirme ve çıkarma eylemleri ÇİZİLMEZ (v1.4-08)", () => {
    vi.mocked(useSettingsMembers).mockReturnValue({
      data: [
        {
          membershipId: "mem-self",
          displayName: "Kendim",
          loginNumber: "10018888",
          role: "teacher",
          branchName: null,
          status: "active",
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useSettingsMembers>);

    const html = renderWithAuth(createElement(SettingsMembersSection), {
      role: "admin",
      membershipId: "mem-self", // çağıranın kendi membershipId'si
    });

    expect(html).toContain("Kendim");
    expect(html).not.toContain("Rol değiştir");
    expect(html).not.toContain("Kurumdan çıkar");
  });

  it("yönetici olmayan rolde (ör. teacher) bu eylemler hiçbir satırda ÇİZİLMEZ", () => {
    const html = renderWithAuth(createElement(SettingsMembersSection), {
      role: "teacher",
      membershipId: "mem-teacher",
    });

    expect(html).not.toContain("Rol değiştir");
    expect(html).not.toContain("Kurumdan çıkar");
  });
});

describe("ChangeRoleDialog (v1.4-07 · #280)", () => {
  const teacherMember: OrganizationMember = {
    membershipId: "mem-t1",
    displayName: "Ayşe Öğretmen",
    loginNumber: "10011001",
    role: "teacher",
    branchName: "Merkez",
    status: "active",
  };

  it("admin rolü seçilebilir bir değer olarak hiçbir yerde sunulmaz", () => {
    const html = renderWithAuth(
      createElement(ChangeRoleDialog, {
        member: teacherMember,
        open: true,
        onClose: vi.fn(),
      })
    );

    // Seçeneklerde teacher, student, parent olmalı
    expect(html).toContain('value="teacher"');
    expect(html).toContain('value="student"');
    expect(html).toContain('value="parent"');
    // Admin asla seçilemez
    expect(html).not.toContain('value="admin"');
    expect(html).not.toContain("Yönetici");
  });

  it("ORB03 geldiğinde ekran atama sayılarını söyler ve ham detail dizgesini basmaz (K-23)", () => {
    const rawDetail = "ders ataması=2, rehberlik=1, program satırı=0";
    const orb03Message = translateMembershipActionError({
      code: "ORB03",
      detail: rawDetail,
    });

    const html = renderWithAuth(
      createElement(ChangeRoleDialog, {
        member: teacherMember,
        open: true,
        onClose: vi.fn(),
        initialError: orb03Message,
      })
    );

    // K-23: Ham detail dizgesi basılmaz
    expect(html).not.toContain(rawDetail);
    // Atama sayıları Türkçe insani bir dille okunur
    expect(html).toContain("2 ders ataması");
    expect(html).toContain("1 rehberlik görevi");
    expect(html).toContain("sınıf yönetiminden ilgili atamaları arşivleyin");
    expect(html).toContain('role="alert"');
  });
});

describe("RemoveMemberDialog (v1.4-07 · #280)", () => {
  const teacherMember: OrganizationMember = {
    membershipId: "mem-t1",
    displayName: "Ayşe Öğretmen",
    loginNumber: "10011001",
    role: "teacher",
    branchName: "Merkez",
    status: "active",
  };

  const studentMember: OrganizationMember = {
    membershipId: "mem-s1",
    displayName: "Mehmet Öğrenci",
    loginNumber: "10011002",
    role: "student",
    branchName: "Merkez",
    status: "active",
  };

  const parentMember: OrganizationMember = {
    membershipId: "mem-p1",
    displayName: "Fatma Veli",
    loginNumber: "10011003",
    role: "parent",
    branchName: "Merkez",
    status: "active",
  };

  it("öğretmen çıkarma onayında 'Üyelik askıya alınacak; kişi kuruma giriş yapamayacak.' yazar, bağ koparma cümlesi YOKTUR (K-23)", () => {
    const html = renderWithAuth(
      createElement(RemoveMemberDialog, {
        member: teacherMember,
        open: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain(
      "Üyelik askıya alınacak; kişi kuruma giriş yapamayacak."
    );
    expect(html).not.toContain("akademik kaydının hesap bağı koparılacak");
  });

  it("öğrenci çıkarma onayında 'akademik kaydının hesap bağı koparılacak' uyarısı VARDIR (K-23)", () => {
    const html = renderWithAuth(
      createElement(RemoveMemberDialog, {
        member: studentMember,
        open: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("Üyelik askıya alınacak");
    expect(html).toContain("akademik kaydının hesap bağı koparılacak");
    expect(html).toContain("Kayıt silinmiyor; istenirse yeniden bağlanabilir.");
  });

  it("veli çıkarma onayında 'akademik kaydının hesap bağı koparılacak' uyarısı VARDIR", () => {
    const html = renderWithAuth(
      createElement(RemoveMemberDialog, {
        member: parentMember,
        open: true,
        onClose: vi.fn(),
      })
    );

    expect(html).toContain("akademik kaydının hesap bağı koparılacak");
  });

  it("admin hedefinde çıkarma onayında 'akademik kaydının hesap bağı koparılacak' uyarısı KESİNLİKLE YER ALMAZ (K-23)", () => {
    const adminMember: OrganizationMember = {
      membershipId: "mem-a1",
      displayName: "Ali Yönetici",
      loginNumber: "10011000",
      role: "admin",
      branchName: null,
      status: "active",
    };

    const html = renderWithAuth(
      createElement(RemoveMemberDialog, {
        member: adminMember,
        open: true,
        onClose: vi.fn(),
      })
    );

    expect(html).not.toContain("akademik kaydının hesap bağı koparılacak");
    expect(html).toContain(
      "Üyelik askıya alınacak; kişi kuruma giriş yapamayacak."
    );
  });
});
