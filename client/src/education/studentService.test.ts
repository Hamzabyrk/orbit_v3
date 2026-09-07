import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_STUDENT_LIMIT,
  extractBranchName,
  extractClassName,
  extractGuardianName,
  loadStudents,
  mapStudentRow,
} from "./studentService";

const fromMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
  },
}));

type QueryResult = { data: unknown; error: unknown };

function createQueryChain(
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
  return chain;
}

describe("studentService", () => {
  describe("extractBranchName", () => {
    it("nesne olarak gelen şube adını ayıklar", () => {
      expect(extractBranchName({ name: "Kadıköy Şubesi" })).toBe(
        "Kadıköy Şubesi"
      );
    });

    it("dizi olarak gelen şube adını ayıklar", () => {
      expect(extractBranchName([{ name: "Bakırköy Şubesi" }])).toBe(
        "Bakırköy Şubesi"
      );
    });

    it("şube yoksa veya boşsa null döner", () => {
      expect(extractBranchName(null)).toBeNull();
      expect(extractBranchName(undefined)).toBeNull();
      expect(extractBranchName([])).toBeNull();
      expect(extractBranchName({ name: "" })).toBeNull();
    });
  });

  describe("extractClassName", () => {
    it("aktif sınıf kaydını bulur ve sınıf adını döner", () => {
      const enrollments = [
        {
          archived_at: null,
          classes: { name: "12-A Sayısal", archived_at: null },
        },
      ];
      expect(extractClassName(enrollments)).toBe("12-A Sayısal");
    });

    it("arşivlenmiş kayıtları eler ve aktif olanı seçer", () => {
      const enrollments = [
        {
          archived_at: "2026-06-01T00:00:00Z",
          classes: { name: "11-A Sayısal", archived_at: null },
        },
        {
          archived_at: null,
          classes: { name: "12-A Sayısal", archived_at: null },
        },
      ];
      expect(extractClassName(enrollments)).toBe("12-A Sayısal");
    });

    it("sınıfın kendisi arşivlenmişse o kaydı dikkate almaz", () => {
      const enrollments = [
        {
          archived_at: null,
          classes: {
            name: "Kapanan Sınıf",
            archived_at: "2026-06-01T00:00:00Z",
          },
        },
      ];
      expect(extractClassName(enrollments)).toBeNull();
    });

    it("kayıt yoksa null döner", () => {
      expect(extractClassName(null)).toBeNull();
      expect(extractClassName([])).toBeNull();
    });
  });

  describe("extractGuardianName", () => {
    it("aktif veli kaydını bulur ve adını döner", () => {
      const links = [
        {
          archived_at: null,
          guardians: { full_name: "Fatma Yılmaz", archived_at: null },
        },
      ];
      expect(extractGuardianName(links)).toBe("Fatma Yılmaz");
    });

    it("birden fazla aktif veli varsa virgülle birleştirir", () => {
      const links = [
        {
          archived_at: null,
          guardians: { full_name: "Fatma Yılmaz", archived_at: null },
        },
        {
          archived_at: null,
          guardians: { full_name: "Ali Yılmaz", archived_at: null },
        },
      ];
      expect(extractGuardianName(links)).toBe("Fatma Yılmaz, Ali Yılmaz");
    });

    it("arşivlenmiş veli bağını veya arşivlenmiş veliyi eler", () => {
      const links = [
        {
          archived_at: "2026-05-01T00:00:00Z",
          guardians: { full_name: "Eski Veli", archived_at: null },
        },
        {
          archived_at: null,
          guardians: {
            full_name: "Silinmiş Veli",
            archived_at: "2026-05-01T00:00:00Z",
          },
        },
        {
          archived_at: null,
          guardians: { full_name: "Geçerli Veli", archived_at: null },
        },
      ];
      expect(extractGuardianName(links)).toBe("Geçerli Veli");
    });

    it("veli bağı yoksa null döner", () => {
      expect(extractGuardianName(null)).toBeNull();
      expect(extractGuardianName([])).toBeNull();
    });
  });

  describe("mapStudentRow (Tip Dürüstlüğü & K-03)", () => {
    it("kaynağı olmayan ve türetilmiş alanları kesinlikle uydurmaz (undefined bırakır)", () => {
      const mapped = mapStudentRow({
        id: "stu-1",
        full_name: "Zeynep Kaya",
        branches: { name: "Merkez" },
        class_enrollments: [
          { archived_at: null, classes: { name: "11-B", archived_at: null } },
        ],
        student_guardians: [
          {
            archived_at: null,
            guardians: { full_name: "Ahmet Kaya", archived_at: null },
          },
        ],
      });

      expect(mapped.id).toBe("stu-1");
      expect(mapped.name).toBe("Zeynep Kaya");
      expect(mapped.branch).toBe("Merkez");
      expect(mapped.group).toBe("11-B");
      expect(mapped.parent).toBe("Ahmet Kaya");

      // K-03: Bu alanlar sıfır veya sahte dize değil, undefined olmak ZORUNDADIR.
      expect(mapped.code).toBeUndefined();
      expect(mapped.attendance).toBeUndefined();
      expect(mapped.score).toBeUndefined();
      expect(mapped.homework).toBeUndefined();
      expect(mapped.payment).toBeUndefined();
      expect(mapped.risk).toBeUndefined();
    });
  });

  describe("loadStudents (Sorgu ve Kesilme Sözleşmesi)", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("öğrencileri ada göre artan sırada ve arşiv filtresiyle çeker", async () => {
      const spy: {
        isArgs?: [string, unknown];
        orderArgs?: [string, { ascending?: boolean }];
        limitArg?: number;
      } = {};

      fromMock.mockReturnValue(
        createQueryChain(
          {
            data: [
              {
                id: "stu-1",
                full_name: "Ali Can",
                branches: { name: "Şube 1" },
                class_enrollments: [],
                student_guardians: [],
              },
            ],
            error: null,
          },
          spy
        )
      );

      const result = await loadStudents(50);

      expect(fromMock).toHaveBeenCalledWith("students");
      expect(spy.isArgs).toEqual(["archived_at", null]);
      expect(spy.orderArgs).toEqual(["full_name", { ascending: true }]);
      expect(spy.limitArg).toBe(50);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].name).toBe("Ali Can");
      expect(result.truncated).toBe(false);
    });

    it("satır sayısı limite eşitse truncated bayrağı true döner (K-03)", async () => {
      const mockRows = Array.from({ length: 5 }, (_, i) => ({
        id: `stu-${i}`,
        full_name: `Öğrenci ${i}`,
        branches: null,
        class_enrollments: [],
        student_guardians: [],
      }));

      fromMock.mockReturnValue(
        createQueryChain({
          data: mockRows,
          error: null,
        })
      );

      const result = await loadStudents(5);

      expect(result.rows).toHaveLength(5);
      expect(result.truncated).toBe(true);
    });

    it("varsayılan üst sınır 100'dür", async () => {
      const spy: { limitArg?: number } = {};
      fromMock.mockReturnValue(
        createQueryChain(
          {
            data: [],
            error: null,
          },
          spy
        )
      );

      await loadStudents();

      expect(spy.limitArg).toBe(DEFAULT_STUDENT_LIMIT);
    });

    it("veritabanı hatasında anlamlı Türkçe hata fırlatır (K-04)", async () => {
      fromMock.mockReturnValue(
        createQueryChain({
          data: null,
          error: { message: "connection refused" },
        })
      );

      await expect(loadStudents()).rejects.toThrow(
        "Öğrenci listesi yüklenemedi."
      );
    });
  });
});
