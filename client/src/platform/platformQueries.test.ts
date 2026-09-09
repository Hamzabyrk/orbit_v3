import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  platformKeys,
  useOrganizationStats,
  usePlatformAuditEvents,
  usePlatformOperators,
  usePlatformOrganizations,
} from "./platformQueries";

const mockUseQuery = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => mockUseQuery(options),
}));

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("platformKeys (K-19 ve Cache İzolasyonu)", () => {
  it("genel anahtar kökünü doğru üretir", () => {
    expect(platformKeys.all).toEqual(["platform"]);
  });

  it("kurum listesi anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve platform kapsamı taşır", () => {
    const key = platformKeys.organizations();
    expect(key).toEqual(["platform", "organizations", { scope: "platform" }]);
  });

  it("operatör listesi anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve platform kapsamı taşır", () => {
    const key = platformKeys.operators();
    expect(key).toEqual(["platform", "operators", { scope: "platform" }]);
  });

  it("platform denetim kaydı anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve platform kapsamı taşır", () => {
    const key = platformKeys.auditEvents();
    expect(key).toEqual(["platform", "auditEvents", { scope: "platform" }]);
  });

  it("kurum istatistikleri anahtarı [alan, kaynak, kapsam] sözleşmesine uyar ve kurumu taşır", () => {
    const key = platformKeys.organizationStats("org-123");
    expect(key).toEqual([
      "platform",
      "organizationStats",
      { organizationId: "org-123" },
    ]);
  });

  it("farklı kurumlar için farklı sorgu anahtarları üretir (operatörün farklı kurum sayılarını görmesi engellenir)", () => {
    const key1 = platformKeys.organizationStats("org-a");
    const key2 = platformKeys.organizationStats("org-b");
    expect(key1).not.toEqual(key2);
  });
});

describe("platformQueries enabled kapıları", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("operatör değilken platform sorguları çalışmaz (enabled: false)", () => {
    mockUseAuth.mockReturnValue({
      identity: { platformOperator: null },
      demoMode: false,
    });

    usePlatformOrganizations();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.organizations(),
        enabled: false,
      })
    );

    usePlatformOperators();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.operators(),
        enabled: false,
      })
    );

    usePlatformAuditEvents();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.auditEvents(),
        enabled: false,
      })
    );
  });

  it("operatör iken platform sorguları çalışır (enabled: true)", () => {
    mockUseAuth.mockReturnValue({
      identity: { platformOperator: { role: "operator" } },
      demoMode: false,
    });

    usePlatformOrganizations();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.organizations(),
        enabled: true,
      })
    );

    usePlatformOperators();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.operators(),
        enabled: true,
      })
    );

    usePlatformAuditEvents();
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.auditEvents(),
        enabled: true,
      })
    );
  });

  it("options.enabled: false verildiğinde sorgu durdurulur", () => {
    mockUseAuth.mockReturnValue({
      identity: { platformOperator: { role: "operator" } },
      demoMode: false,
    });

    usePlatformOrganizations({ enabled: false });
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("kurum istatistikleri: kurum kimliği yokken veya operatör değilken çalışmaz", () => {
    // 1. Durum: Operatör ama kurum kimliği yok/boş
    mockUseAuth.mockReturnValue({
      identity: { platformOperator: { role: "operator" } },
      demoMode: false,
    });
    useOrganizationStats(undefined);
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );

    // 2. Durum: Kurum kimliği var ama kullanıcı operatör değil
    mockUseAuth.mockReturnValue({
      identity: { platformOperator: null },
      demoMode: false,
    });
    useOrganizationStats("org-123");
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );

    // 3. Durum: Hem operatör hem kurum kimliği var
    mockUseAuth.mockReturnValue({
      identity: { platformOperator: { role: "operator" } },
      demoMode: false,
    });
    useOrganizationStats("org-123");
    expect(mockUseQuery).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryKey: platformKeys.organizationStats("org-123"),
        enabled: true,
      })
    );
  });
});
