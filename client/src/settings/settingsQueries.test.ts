import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  settingsKeys,
  useProfileContact,
  useSettingsBranches,
  useSettingsMembers,
} from "./settingsQueries";

const mockUseQuery = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("settingsKeys (K-19 ve Cache İzolasyonu)", () => {
  it("genel anahtar kökünü doğru üretir", () => {
    expect(settingsKeys.all).toEqual(["settings"]);
  });

  it("üye listesi anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır", () => {
    const key = settingsKeys.members("org-123");
    expect(key).toEqual(["settings", "members", { organizationId: "org-123" }]);
  });

  it("şube listesi anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır", () => {
    const key = settingsKeys.branches("org-456");
    expect(key).toEqual([
      "settings",
      "branches",
      { organizationId: "org-456" },
    ]);
  });

  it("kullanıcı profil iletişim anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kullanıcıyı taşır", () => {
    const key = settingsKeys.profileContact("user-789");
    expect(key).toEqual(["settings", "profileContact", { userId: "user-789" }]);
  });

  it("farklı kurumlar için farklı sorgu anahtarları üretir (kurumlar arası önbellek izolasyonu)", () => {
    const memberKey1 = settingsKeys.members("org-a");
    const memberKey2 = settingsKeys.members("org-b");
    expect(memberKey1).not.toEqual(memberKey2);

    const branchKey1 = settingsKeys.branches("org-a");
    const branchKey2 = settingsKeys.branches("org-b");
    expect(branchKey1).not.toEqual(branchKey2);
  });

  it("farklı kullanıcılar için farklı profil iletişim anahtarları üretir (kullanıcılar arası önbellek izolasyonu)", () => {
    const userKey1 = settingsKeys.profileContact("user-a");
    const userKey2 = settingsKeys.profileContact("user-b");
    expect(userKey1).not.toEqual(userKey2);
  });
});

describe("settingsQueries enabled kapıları", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("useSettingsMembers", () => {
    it("kurum kimliği yokken sorgu çalışmaz (enabled: false)", () => {
      mockUseAuth.mockReturnValue({
        identity: { membership: null },
        demoMode: false,
      });

      useSettingsMembers();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("demo modundayken sorgu çalışmaz (enabled: false)", () => {
      mockUseAuth.mockReturnValue({
        identity: {
          membership: { organizationId: "org-123", organizationCode: 1000 },
        },
        demoMode: true,
      });

      useSettingsMembers();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("normal modda ve kurum kimliği varken sorgu çalışır (enabled: true)", () => {
      mockUseAuth.mockReturnValue({
        identity: {
          membership: { organizationId: "org-123", organizationCode: 1000 },
        },
        demoMode: false,
      });

      useSettingsMembers();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: settingsKeys.members("org-123"),
          enabled: true,
        })
      );
    });

    it("options.enabled: false verildiğinde sorgu çalıştırılmaz", () => {
      mockUseAuth.mockReturnValue({
        identity: {
          membership: { organizationId: "org-123", organizationCode: 1000 },
        },
        demoMode: false,
      });

      useSettingsMembers({ enabled: false });
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });
  });

  describe("useSettingsBranches", () => {
    it("kurum kimliği yokken sorgu çalışmaz (enabled: false)", () => {
      mockUseAuth.mockReturnValue({
        identity: { membership: null },
        demoMode: false,
      });

      useSettingsBranches();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("demo modundayken sorgu çalışmaz (enabled: false)", () => {
      mockUseAuth.mockReturnValue({
        identity: { membership: { organizationId: "org-123" } },
        demoMode: true,
      });

      useSettingsBranches("org-123");
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("normal modda ve kurum kimliği varken sorgu çalışır (enabled: true)", () => {
      mockUseAuth.mockReturnValue({
        identity: { membership: { organizationId: "org-123" } },
        demoMode: false,
      });

      useSettingsBranches("org-123");
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: settingsKeys.branches("org-123"),
          enabled: true,
        })
      );
    });
  });

  describe("useProfileContact", () => {
    it("kullanıcı kimliği yokken sorgu çalışmaz (enabled: false)", () => {
      mockUseAuth.mockReturnValue({
        identity: null,
        demoMode: false,
      });

      useProfileContact();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("demo modundayken sorgu çalışmaz (enabled: false)", () => {
      mockUseAuth.mockReturnValue({
        identity: { userId: "user-123" },
        demoMode: true,
      });

      useProfileContact();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
    });

    it("normal modda ve kullanıcı kimliği varken sorgu çalışır (enabled: true)", () => {
      mockUseAuth.mockReturnValue({
        identity: { userId: "user-123" },
        demoMode: false,
      });

      useProfileContact();
      expect(mockUseQuery).toHaveBeenLastCalledWith(
        expect.objectContaining({
          queryKey: settingsKeys.profileContact("user-123"),
          enabled: true,
        })
      );
    });
  });
});
