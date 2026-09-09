import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateAttendancePercentage,
  DEFAULT_ATTENDANCE_SESSION_LIMIT,
  extractActiveName,
  formatSessionDateTime,
  formatSessionTitle,
  loadAttendanceSessions,
  loadLatestAttendanceSession,
  loadStudentAttendancePercentages,
  mapSessionRow,
} from "./attendanceService";
import { AttendancePage } from "@/components/education/pages/AttendancePage";

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
  },
}));

type QueryResult = { data: unknown; error: unknown };

function createQueryChain(
  result: QueryResult,
  spy?: {
    isArgs?: [string, unknown];
    orderArgs?: [string, { ascending?: boolean; nullsFirst?: boolean }][];
    limitArg?: number;
    inArgs?: [string, unknown[]];
  }
) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.is = vi.fn((col: string, val: unknown) => {
    if (spy) spy.isArgs = [col, val];
    return chain;
  });
  chain.in = vi.fn((col: string, vals: unknown[]) => {
    if (spy) spy.inArgs = [col, vals];
    return chain;
  });
  chain.order = vi.fn(
    (col: string, opts: { ascending?: boolean; nullsFirst?: boolean }) => {
      if (spy) {
        if (!spy.orderArgs) spy.orderArgs = [];
        spy.orderArgs.push([col, opts]);
      }
      return chain;
    }
  );
  chain.limit = vi.fn((limit: number) => {
    if (spy) spy.limitArg = limit;
    return Promise.resolve(result);
  });
  return chain;
}

describe("attendanceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateAttendancePercentage (Formül Doğruluğu & K-22)", () => {
    it("izinli ders payda ve paya katılmaz, geç kalma devam sayılır", () => {
      // (Katıldı: 8 + Geç kaldı: 2) / (Katıldı: 8 + Geç kaldı: 2 + Gelmedi: 2) = 10 / 12 = %83
      const percentage = calculateAttendancePercentage({
        present: 8,
        late: 2,
        absent: 2,
      });
      expect(percentage).toBe(83);
    });

    it("öğrenci tüm derslere katıldıysa %100 üretir", () => {
      expect(
        calculateAttendancePercentage({ present: 5, late: 0, absent: 0 })
      ).toBe(100);
    });

    it("öğrenci yalnızca geç kaldıysa %100 üretir (geç kalma devamdır)", () => {
      expect(
        calculateAttendancePercentage({ present: 0, late: 4, absent: 0 })
      ).toBe(100);
    });

    it("öğrenci hiçbir derse katılmadıysa %0 üretir (payda sıfır değil)", () => {
      expect(
        calculateAttendancePercentage({ present: 0, late: 0, absent: 3 })
      ).toBe(0);
    });

    it("payda sıfırken (hiç ders yok veya yalnız izinli) kesinlikle 0 DEĞİL undefined döner (K-22)", () => {
      // K-22: Yokluk etiketi de bir iddiadır. Payda 0 iken rozet çizilmez.
      expect(
        calculateAttendancePercentage({ present: 0, late: 0, absent: 0 })
      ).toBeUndefined();
    });
  });

  describe("formatSessionDateTime & formatSessionTitle", () => {
    it("tarih ve saat bilgisini Türkçe arayüz formatına çevirir", () => {
      expect(formatSessionDateTime("2026-09-08", "09:00:00")).toBe(
        "8 Eylül 2026, 09:00"
      );
      expect(formatSessionDateTime("2026-09-08")).toBe("8 Eylül 2026");
      expect(formatSessionDateTime("2026-01-15", "14:30:00")).toBe(
        "15 Ocak 2026, 14:30"
      );
    });

    it("ders yoklaması için tam başlık üretir", () => {
      const title = formatSessionTitle({
        id: "sess-1",
        classId: "cls-1",
        className: "YKS 12-A",
        subjectId: "sub-1",
        subjectName: "TYT Matematik",
        sessionDate: "2026-09-08",
        startsAt: "09:00",
        records: [],
      });
      expect(title).toBe("TYT Matematik · YKS 12-A · 8 Eylül 2026, 09:00");
    });

    it("günlük yoklamada (subjectId boş) Günlük Yoklama önekini kullanır", () => {
      const title = formatSessionTitle({
        id: "sess-2",
        classId: "cls-1",
        className: "11-B Sayısal",
        subjectId: null,
        subjectName: null,
        sessionDate: "2026-09-08",
        startsAt: null,
        records: [],
      });
      expect(title).toBe("Günlük Yoklama · 11-B Sayısal · 8 Eylül 2026");
    });
  });

  describe("extractActiveName", () => {
    it("aktif nesneden adı ayıklar", () => {
      expect(extractActiveName({ name: "Fizik", archived_at: null })).toBe(
        "Fizik"
      );
      expect(extractActiveName([{ name: "Kimya", archived_at: null }])).toBe(
        "Kimya"
      );
    });

    it("arşivlenmiş nesneyi dikkate almaz (null döner)", () => {
      expect(
        extractActiveName({
          name: "Eski Ders",
          archived_at: "2026-01-01T00:00:00Z",
        })
      ).toBeNull();
    });

    it("boş veya tanımsız değerde null döner", () => {
      expect(extractActiveName(null)).toBeNull();
      expect(extractActiveName(undefined)).toBeNull();
    });
  });

  describe("mapSessionRow", () => {
    it("oturum ve kayıt satırlarını eksiksiz eşler ve kayıtları öğrenci adına göre sıralar", () => {
      const mapped = mapSessionRow({
        id: "sess-1",
        class_id: "cls-1",
        subject_id: "sub-1",
        session_date: "2026-09-08",
        starts_at: "09:00:00",
        classes: { name: "12-A", archived_at: null },
        subjects: { name: "Matematik", archived_at: null },
        attendance_records: [
          {
            id: "rec-2",
            student_id: "stu-2",
            status: "absent",
            students: { full_name: "Zeynep Kaya" },
          },
          {
            id: "rec-1",
            student_id: "stu-1",
            status: "present",
            students: { full_name: "Ahmet Demir" },
          },
        ],
      });

      expect(mapped.id).toBe("sess-1");
      expect(mapped.className).toBe("12-A");
      expect(mapped.subjectName).toBe("Matematik");
      expect(mapped.startsAt).toBe("09:00");
      expect(mapped.records).toHaveLength(2);
      // Alfabetik sıralama: Ahmet Demir önce gelir
      expect(mapped.records[0].studentName).toBe("Ahmet Demir");
      expect(mapped.records[0].status).toBe("Katıldı");
      expect(mapped.records[1].studentName).toBe("Zeynep Kaya");
      expect(mapped.records[1].status).toBe("Gelmedi");
    });
  });

  describe("loadStudentAttendancePercentages (RPC student_attendance_counts & Bulgu 1)", () => {
    it("boş öğrenci listesinde veritabanına sorgu atmadan boş map döner", async () => {
      const result = await loadStudentAttendancePercentages([]);
      expect(result.size).toBe(0);
      expect(rpcMock).not.toHaveBeenCalled();
      expect(fromMock).not.toHaveBeenCalled();
    });

    // ⛔ PostgREST `bigint` sütunlarını JSON'a DİZGE olarak koyar: sayaçlar
    // üretimde `8` değil `"8"` olarak gelir. Dönüşüm `Number(...)` ile doğru
    // yapılıyor — ama mock'lar sayı verdiği için o dönüşüm hiçbir testte
    // sınanmıyordu. Birinin yarın `Number(...)`'ı sadeleştirmesi bu testler
    // yeşilken üretimde yüzdeleri bozardı: "8" + "2" dizge birleşmesidir.
    it("sayaçlar dizge olarak gelse bile yüzde doğru hesaplanır (PostgREST bigint)", async () => {
      rpcMock.mockResolvedValue({
        data: [
          {
            student_id: "stu-str",
            present_count: "8",
            late_count: "2",
            absent_count: "2",
          },
        ],
        error: null,
      });

      const result = await loadStudentAttendancePercentages(["stu-str"]);

      // (8 + 2) / (8 + 2 + 2) = %83 — dizge birleşmesi olsaydı sonuç bambaşka olurdu
      expect(result.get("stu-str")).toBe(83);
    });

    it("student_attendance_counts RPC'sini tek seferde çağırır ve devam yüzdelerini hesaplar", async () => {
      rpcMock.mockResolvedValue({
        data: [
          // stu-1: 8 present, 2 late, 2 absent -> (8+2)/(8+2+2) = 10/12 = %83
          {
            student_id: "stu-1",
            present_count: 8,
            late_count: 2,
            absent_count: 2,
          },
          // stu-2: 0 present, 4 late, 0 absent -> (4)/(4) = %100 (geç kalma devamdır)
          {
            student_id: "stu-2",
            present_count: 0,
            late_count: 4,
            absent_count: 0,
          },
          // stu-3: 0 present, 0 late, 3 absent -> (0)/(3) = %0
          {
            student_id: "stu-3",
            present_count: 0,
            late_count: 0,
            absent_count: 3,
          },
          // stu-4: payda 0 (tüm sayaçlar 0 veya yalnız excused) -> undefined (K-22)
          {
            student_id: "stu-4",
            present_count: 0,
            late_count: 0,
            absent_count: 0,
          },
        ],
        error: null,
      });

      const map = await loadStudentAttendancePercentages([
        "stu-1",
        "stu-2",
        "stu-3",
        "stu-4",
        "stu-5", // kaydı hiç dönmeyen öğrenci
      ]);

      // RPC tek seferde çağrılmalıdır, öğrenci başına N çağrı yapılmaz (K-06)
      expect(rpcMock).toHaveBeenCalledTimes(1);
      expect(rpcMock).toHaveBeenCalledWith("student_attendance_counts", {
        target_student_ids: ["stu-1", "stu-2", "stu-3", "stu-4", "stu-5"],
      });

      // ⛔ ENGELLEYİCİ KRİTER: attendance_records tablosuna doğrudan sorgu GİTMEZ
      expect(fromMock).not.toHaveBeenCalledWith("attendance_records");

      // Yüzde doğrulamaları
      expect(map.get("stu-1")).toBe(83);
      expect(map.get("stu-2")).toBe(100);
      expect(map.get("stu-3")).toBe(0);
      // K-22: Payda sıfır iken %0 değil undefined kalmalıdır
      expect(map.get("stu-4")).toBeUndefined();
      // Kaydı dönmeyen öğrenci undefined kalmalıdır
      expect(map.get("stu-5")).toBeUndefined();
    });

    it("veritabanı hatasında boş map döner (fail-closed, K-04)", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "connection timeout" },
      });

      const map = await loadStudentAttendancePercentages(["stu-1"]);
      expect(map.size).toBe(0);
      expect(fromMock).not.toHaveBeenCalledWith("attendance_records");
    });
  });

  describe("loadLatestAttendanceSession", () => {
    it("en son aktif oturumu tarih ve saat azalan sırayla çeker", async () => {
      const spy: {
        isArgs?: [string, unknown];
        orderArgs?: [string, { ascending?: boolean; nullsFirst?: boolean }][];
        limitArg?: number;
      } = {};

      fromMock.mockReturnValue(
        createQueryChain(
          {
            data: [
              {
                id: "sess-latest",
                class_id: "cls-1",
                session_date: "2026-09-08",
                starts_at: "09:00:00",
                classes: { name: "12-A", archived_at: null },
                subjects: { name: "Matematik", archived_at: null },
                attendance_records: [],
              },
            ],
            error: null,
          },
          spy
        )
      );

      const result = await loadLatestAttendanceSession();

      expect(fromMock).toHaveBeenCalledWith("attendance_sessions");
      expect(spy.isArgs).toEqual(["archived_at", null]);
      expect(spy.orderArgs).toEqual([
        ["session_date", { ascending: false }],
        ["starts_at", { ascending: false, nullsFirst: false }],
      ]);
      expect(spy.limitArg).toBe(1);

      expect(result.session).not.toBeNull();
      expect(result.session?.id).toBe("sess-latest");
    });

    it("oturum yoksa session: null döner (K-03: uydurulmuş değer yok)", async () => {
      fromMock.mockReturnValue(
        createQueryChain({
          data: [],
          error: null,
        })
      );

      const result = await loadLatestAttendanceSession();
      expect(result.session).toBeNull();
    });

    it("veritabanı hatasında anlamlı Türkçe hata fırlatır", async () => {
      fromMock.mockReturnValue(
        createQueryChain({
          data: null,
          error: { message: "database error" },
        })
      );

      await expect(loadLatestAttendanceSession()).rejects.toThrow(
        "Yoklama oturumu yüklenemedi."
      );
    });
  });

  describe("loadAttendanceSessions (Kesilme Sözleşmesi)", () => {
    it("oturum sayısı limite eşitse truncated: true döner", async () => {
      const mockSessions = Array.from({ length: 5 }, (_, i) => ({
        id: `sess-${i}`,
        class_id: "cls-1",
        session_date: "2026-09-08",
        starts_at: "09:00:00",
        classes: null,
        subjects: null,
        attendance_records: [],
      }));

      fromMock.mockReturnValue(
        createQueryChain({
          data: mockSessions,
          error: null,
        })
      );

      const result = await loadAttendanceSessions(5);
      expect(result.rows).toHaveLength(5);
      expect(result.truncated).toBe(true);
    });

    it("varsayılan üst sınır 50'dir", async () => {
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

      await loadAttendanceSessions();
      expect(spy.limitArg).toBe(DEFAULT_ATTENDANCE_SESSION_LIMIT);
    });
  });

  type MaybeElement = {
    type?: unknown;
    props?: { children?: unknown; [key: string]: unknown };
  };
  type ElementNode = MaybeElement & {
    props: { children?: unknown; [key: string]: unknown };
  };

  function isElementNode(el: MaybeElement): el is ElementNode {
    return typeof el.props === "object" && el.props !== null;
  }

  function findElements(
    node: unknown,
    predicate: (el: MaybeElement) => boolean
  ): ElementNode[] {
    if (!node) return [];
    if (Array.isArray(node)) {
      return node.flatMap(item => findElements(item, predicate));
    }
    if (typeof node !== "object") return [];
    const results: ElementNode[] = [];
    const el = node as MaybeElement;
    // ⛔ `predicate` tek başına yetmiyor: gezinti ağacındaki her düğüm React
    // öğesi değil, `children` dizge ya da sayı olabilir ve o düğümlerde
    // `props` yok. Eskiden `el` doğrudan itiliyordu ve dönen dizinin tipi
    // `props`'u ZORUNLU sayıyordu — yani `props`'suz bir düğüm geçseydi
    // çağıran taraf çalışma zamanında patlardı. Tip yalanını `pnpm check`
    // görmüyordu (#243); artık daraltma gerçekten yapılıyor.
    if (predicate(el) && isElementNode(el)) {
      results.push(el);
    }
    if (el.props && el.props.children) {
      results.push(...findElements(el.props.children, predicate));
    }
    return results;
  }

  describe("AttendancePage UI davranışları (K-03 & Etkileşim Kısıtı)", () => {
    it("üretimde durum düğmeleri etkileşimli değildir (v1.4 uyarısı ve gerçek oturum başlığı görünür)", () => {
      const setAttendances = vi.fn();
      const session = {
        id: "sess-1",
        classId: "cls-1",
        className: "12-A",
        subjectId: "sub-1",
        subjectName: "TYT Matematik",
        sessionDate: "2026-09-08",
        startsAt: "09:00",
        records: [
          {
            id: "rec-1",
            studentId: "stu-1",
            studentName: "Ali Can",
            status: "Katıldı" as const,
          },
        ],
      };

      const element = AttendancePage({
        role: "teacher",
        attendances: {},
        setAttendances,
        session,
        isDemo: false,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain(
        "Yoklama alma ve düzenleme v1.4 sürümünde açılacaktır"
      );
      expect(elementString).toContain(
        "TYT Matematik · 12-A · 8 Eylül 2026, 09:00"
      );
      expect(elementString).toContain("Kayıtlı Oturum");
    });

    it("üretimde oturum yoksa 'Henüz yoklama kaydı yok' boş durumunu gösterir (K-03)", () => {
      const element = AttendancePage({
        role: "admin",
        attendances: {},
        setAttendances: vi.fn(),
        session: null,
        isDemo: false,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain("Henüz yoklama kaydı yok");
      expect(elementString).not.toContain(
        "TYT Matematik · YKS 12-A · 15 Ağustos, 09:00"
      );
    });

    it("demo modunda 'Taslak' rozeti gösterilir ve butonlar interaktiftir", () => {
      const setAttendances = vi.fn();
      const element = AttendancePage({
        role: "admin",
        attendances: { "stu-1": "Katıldı" },
        setAttendances,
        students: [
          {
            id: "stu-1",
            name: "Ali Can",
            group: "12-A",
            branch: "Merkez",
            parent: "Veli Can",
          },
        ],
        isDemo: true,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain("Taslak");
      expect(elementString).not.toContain(
        "Yoklama alma ve düzenleme v1.4 sürümünde açılacaktır"
      );

      // Demo modunda durum düğmelerini bul
      const buttons = findElements(
        element,
        el =>
          el.type === "button" &&
          typeof el.props?.children === "string" &&
          ["Katıldı", "Geç kaldı", "Gelmedi", "İzinli"].includes(
            el.props.children
          )
      );

      expect(buttons).toHaveLength(4);
      const lateBtn = buttons.find(b => b.props.children === "Geç kaldı");
      expect(lateBtn).toBeDefined();
      expect(lateBtn?.props.disabled).toBeFalsy();

      // Butona tıklandığında setAttendances çağrıldığını doğrula
      const onClick = lateBtn?.props.onClick as (() => void) | undefined;
      expect(onClick).toBeDefined();
      onClick?.();

      expect(setAttendances).toHaveBeenCalledTimes(1);
    });

    it("üretimde butonlar disabled=true'dur ve onClick taşımaz", () => {
      const setAttendances = vi.fn();
      const session = {
        id: "sess-1",
        classId: "cls-1",
        className: "12-A",
        subjectId: "sub-1",
        subjectName: "TYT Matematik",
        sessionDate: "2026-09-08",
        startsAt: "09:00",
        records: [
          {
            id: "rec-1",
            studentId: "stu-1",
            studentName: "Ali Can",
            status: "Katıldı" as const,
          },
        ],
      };

      const element = AttendancePage({
        role: "teacher",
        attendances: {},
        setAttendances,
        session,
        isDemo: false,
      });

      const buttons = findElements(
        element,
        el =>
          el.type === "button" &&
          typeof el.props?.children === "string" &&
          ["Katıldı", "Geç kaldı", "Gelmedi", "İzinli"].includes(
            el.props.children
          )
      );

      expect(buttons).toHaveLength(4);
      for (const btn of buttons) {
        expect(btn.props.disabled).toBe(true);
        expect(btn.props["aria-disabled"]).toBe("true");
        expect(btn.props.onClick).toBeUndefined();
      }

      expect(setAttendances).not.toHaveBeenCalled();
    });
  });
});
