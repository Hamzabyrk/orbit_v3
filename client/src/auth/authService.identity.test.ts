import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

const { loadAuthenticatedIdentity } = await import("./authService");

type QueryResult = { data: unknown; error: unknown };

/**
 * Supabase istemcisinin akıcı (fluent) zincirini taklit eder. Ara çağrılar
 * kendini döndürür; `single`/`maybeSingle` sonucu verir.
 */
function chainReturning(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "is"]) {
    chain[method] = () => chain;
  }
  chain.single = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  return chain;
}

const ok = (data: unknown): QueryResult => ({ data, error: null });
const empty: QueryResult = { data: null, error: null };
const failed: QueryResult = { data: null, error: { message: "boom" } };

function mockTables(tables: Record<string, QueryResult>) {
  fromMock.mockImplementation((table: string) =>
    chainReturning(tables[table] ?? empty)
  );
}

const user = {
  id: "user-1",
  email: "kisi@dershane.com",
  user_metadata: { full_name: "Test Kişi" },
} as unknown as User;

const membershipRow = ok({
  id: "membership-1",
  organization_id: "org-1",
  branch_id: null,
  role: "admin",
});

const organizationRow = ok({ name: "Orbit Dershane", code: 1042 });
const branchRow = ok({ id: "branch-1", name: "Merkez" });
const operatorRow = ok({ role: "owner" });

beforeEach(() => {
  fromMock.mockReset();
});

describe("loadAuthenticatedIdentity", () => {
  it("kurum üyesini üyelik yüzüyle çözer", async () => {
    mockTables({
      organization_memberships: membershipRow,
      organizations: organizationRow,
      branches: branchRow,
      platform_operators: empty,
      profiles: ok({ display_name: "Test Kişi" }),
    });

    const identity = await loadAuthenticatedIdentity(user);

    expect(identity.membership?.role).toBe("admin");
    expect(identity.membership?.organizationCode).toBe(1042);
    expect(identity.platformOperator).toBeNull();
  });

  it("üyeliği olmayan platform operatörünü oturumdan atmaz", async () => {
    // D2'nin çözdüğü hata tam olarak buydu: kimlik yalnızca üyeliğe bakıyordu
    // ve operatörün tasarım gereği üyeliği olmadığı için giriş yapar yapmaz
    // sistemden atılıyordu.
    mockTables({
      organization_memberships: empty,
      platform_operators: operatorRow,
      profiles: ok({ display_name: "Operatör" }),
    });

    const identity = await loadAuthenticatedIdentity(user);

    expect(identity.membership).toBeNull();
    expect(identity.platformOperator).toEqual({ role: "owner" });
  });

  it("hem üye hem operatör olan kullanıcıda iki ekseni de taşır", async () => {
    // Test kurumu silinene kadar kurucu ekip üyesi bu durumda olacak.
    mockTables({
      organization_memberships: membershipRow,
      organizations: organizationRow,
      branches: branchRow,
      platform_operators: operatorRow,
      profiles: ok({ display_name: "Kurucu" }),
    });

    const identity = await loadAuthenticatedIdentity(user);

    expect(identity.membership?.organizationName).toBe("Orbit Dershane");
    expect(identity.platformOperator?.role).toBe("owner");
  });

  it("iki eksen de boşsa reddeder", async () => {
    mockTables({
      organization_memberships: empty,
      platform_operators: empty,
      profiles: empty,
    });

    await expect(loadAuthenticatedIdentity(user)).rejects.toThrow(
      /kurum üyeliği veya platform yetkisi bulunamadı/i
    );
  });

  it("üyelik sorgusu hata verirse geçirmez", async () => {
    // Yetki çözümlenemediğinde fail-open olmak kabul edilemez.
    mockTables({
      organization_memberships: failed,
      platform_operators: operatorRow,
    });

    await expect(loadAuthenticatedIdentity(user)).rejects.toThrow(
      /Kurum üyeliği doğrulanamadı/i
    );
  });

  it("operatör sorgusu hata verirse geçirmez", async () => {
    mockTables({
      organization_memberships: empty,
      platform_operators: failed,
    });

    await expect(loadAuthenticatedIdentity(user)).rejects.toThrow(
      /Platform yetkisi doğrulanamadı/i
    );
  });

  it("tanınmayan rolü yetki gibi kabul etmez", async () => {
    mockTables({
      organization_memberships: ok({
        id: "m",
        organization_id: "org-1",
        branch_id: null,
        role: "platform_admin",
      }),
      platform_operators: empty,
    });

    await expect(loadAuthenticatedIdentity(user)).rejects.toThrow(
      /rol tanınmadı/i
    );
  });
});
