import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CLASS_LIMIT,
  loadClasses,
  loadMentorNames,
  mapClassRow,
} from "./classService";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

type QueryResult = { data: unknown; error: unknown };

function createClassQueryChain(
  result: QueryResult,
  spy?: {
    isArgs?: [string, unknown];
    orderArgs?: [string, { ascending?: boolean }];
    limitArg?: number;
  }
) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn((col: string, val: unknown) => {
    if (spy) spy.isArgs = [col, val];
    return chain;
  });
  chain.order = vi.fn((col: string, opts: { ascending?: boolean }) => {
    if (spy) spy.orderArgs = [col, opts];
    return chain;
  });
  chain.limit = vi.fn((limit: number) => {
    if (spy) spy.limitArg = limit;
    return Promise.resolve(result);
  });
  chain.in = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("classService", () => {
  describe("mapClassRow (Eşleme ve Öğrenci Sayısı)", () => {
    it("yalnızca aktif kayıtları öğrenci sayısına dahil eder", () => {
      const row = {
        id: "class-1",
        name: "YKS Sayısal 12-A",
        program: "YKS",
        mentor_membership_id: "mem-1",
        class_enrollments: [
          { id: "e-1", archived_at: null },
          { id: "e-2", archived_at: "2026-05-01T00:00:00Z" },
          { id: "e-3", archived_at: null },
        ],
      };

      const mentorMap = new Map([["mem-1", "Bahar Aydın"]]);
      const mapped = mapClassRow(row, mentorMap);

      expect(mapped.id).toBe("class-1");
      expect(mapped.name).toBe("YKS Sayısal 12-A");
      expect(mapped.program).toBe("YKS");
      expect(mapped.mentor).toBe("Bahar Aydın");
      expect(mapped.studentCount).toBe(2);

      // K-03: Türetilmiş alanlar uydurulmaz
      expect(mapped.attendance).toBeUndefined();
      expect(mapped.nextLesson).toBeUndefined();
    });

    it("mentor bulunamadığında veya atanmadığında null döner", () => {
      const row = {
        id: "class-2",
        name: "LGS 8-B",
        program: null,
        mentor_membership_id: null,
        class_enrollments: [],
      };

      const mapped = mapClassRow(row, new Map());

      expect(mapped.program).toBeNull();
      expect(mapped.mentor).toBeNull();
      expect(mapped.studentCount).toBe(0);
    });
  });

  describe("loadMentorNames (İsim Çözümleme)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("boş liste verildiğinde veritabanına gitmeden boş harita döner", async () => {
      const result = await loadMentorNames([]);
      expect(result.size).toBe(0);
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("üyelik ve profil tablolarını sorgulayarak isimleri haritaya bağlar", async () => {
      fromMock.mockImplementation((table: string) => {
        if (table === "organization_memberships") {
          return createClassQueryChain({
            data: [
              { id: "mem-1", user_id: "user-1" },
              { id: "mem-2", user_id: "user-2" },
            ],
            error: null,
          });
        }
        if (table === "profiles") {
          return createClassQueryChain({
            data: [
              { id: "user-1", display_name: "Bahar Aydın" },
              { id: "user-2", display_name: "Kemal Demir" },
            ],
            error: null,
          });
        }
        return createClassQueryChain({ data: null, error: null });
      });

      const names = await loadMentorNames(["mem-1", "mem-2"]);

      expect(names.get("mem-1")).toBe("Bahar Aydın");
      expect(names.get("mem-2")).toBe("Kemal Demir");
    });
  });

  describe("loadClasses (Sorgu ve Kesilme Sözleşmesi)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("sınıfları ada göre artan sırada ve arşiv filtresiyle çeker", async () => {
      const spy: {
        isArgs?: [string, unknown];
        orderArgs?: [string, { ascending?: boolean }];
        limitArg?: number;
      } = {};

      fromMock.mockReturnValue(
        createClassQueryChain(
          {
            data: [
              {
                id: "cls-1",
                name: "YKS 12-A",
                program: "YKS",
                mentor_membership_id: null,
                class_enrollments: [],
              },
            ],
            error: null,
          },
          spy
        )
      );

      const result = await loadClasses(50);

      expect(fromMock).toHaveBeenCalledWith("classes");
      expect(spy.isArgs).toEqual(["archived_at", null]);
      expect(spy.orderArgs).toEqual(["name", { ascending: true }]);
      expect(spy.limitArg).toBe(50);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("YKS 12-A");
      expect(result.truncated).toBe(false);
    });

    it("satır sayısı limite eşitse truncated bayrağı true döner (K-03)", async () => {
      const mockRows = Array.from({ length: 3 }, (_, i) => ({
        id: `cls-${i}`,
        name: `Sınıf ${i}`,
        program: "YKS",
        mentor_membership_id: null,
        class_enrollments: [],
      }));

      fromMock.mockReturnValue(
        createClassQueryChain({
          data: mockRows,
          error: null,
        })
      );

      const result = await loadClasses(3);

      expect(result.rows).toHaveLength(3);
      expect(result.truncated).toBe(true);
    });

    it("varsayılan üst sınır 100'dür", async () => {
      const spy: { limitArg?: number } = {};
      fromMock.mockReturnValue(
        createClassQueryChain(
          {
            data: [],
            error: null,
          },
          spy
        )
      );

      await loadClasses();

      expect(spy.limitArg).toBe(DEFAULT_CLASS_LIMIT);
    });

    it("veritabanı hatasında anlamlı Türkçe hata fırlatır (K-04)", async () => {
      fromMock.mockReturnValue(
        createClassQueryChain({
          data: null,
          error: { message: "timeout" },
        })
      );

      await expect(loadClasses()).rejects.toThrow("Sınıf listesi yüklenemedi.");
    });
  });
});
