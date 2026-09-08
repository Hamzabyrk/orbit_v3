import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatExamSummary,
  loadExamParticipantCount,
  loadLatestExam,
  loadStudentLatestExamScores,
  mapLatestExamRow,
  type LatestExamDetail,
} from "./examService";
import { AssessmentsPage } from "@/components/education/pages/AssessmentsPage";

const fromMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: (table: string) => fromMock(table),
    rpc: (fn: string, args: unknown) => rpcMock(fn, args),
  },
}));

vi.mock("@/auth/useAuth", () => ({
  useAuth: () => ({
    identity: {
      displayName: "Zeynep Kaya",
      membership: { organizationId: "org-1" },
    },
  }),
}));

type QueryResult = { data: unknown; error: unknown };

function createQueryChain(
  result: QueryResult,
  spy?: {
    selectArg?: string;
    isArgs?: [string, unknown];
    orderArgs?: [string, { ascending?: boolean }][];
    limitArg?: number;
  }
) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn((columns: string) => {
    if (spy) spy.selectArg = columns;
    return chain;
  });
  chain.is = vi.fn((col: string, val: unknown) => {
    if (spy) spy.isArgs = [col, val];
    return chain;
  });
  chain.order = vi.fn((col: string, opts: { ascending?: boolean }) => {
    if (spy) {
      if (!spy.orderArgs) spy.orderArgs = [];
      spy.orderArgs.push([col, opts]);
    }
    return chain;
  });
  chain.limit = vi.fn((limit: number) => {
    if (spy) spy.limitArg = limit;
    return Promise.resolve(result);
  });
  return chain;
}

describe("examService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tarih biçimlendiricinin kendi testleri `trDate.test.ts`'te; burada
  // tekrarlanmıyor — aynı olgu iki yerde sınanırsa biri eskir (K-06).
  describe("formatExamSummary (K-22 & max_score Kuralı)", () => {
    it("max_score dolu olduğunda 'N üzerinden' ibaresini ekler", () => {
      const exam: LatestExamDetail = {
        id: "exam-1",
        name: "TYT Deneme 06",
        examDate: "2026-08-14",
        maxScore: 100,
        participantCount: 54,
      };

      const summary = formatExamSummary(exam);
      expect(summary).toBe("14 Ağustos 2026 · 54 katılımcı · 100 üzerinden");
    });

    it("max_score boş (null/undefined) olduğunda 'üzerinden' ibaresi KESİNLİKLE üretilmez (K-22, K-03)", () => {
      const examWithNull: LatestExamDetail = {
        id: "exam-2",
        name: "Kazanım Değerlendirme",
        examDate: "2026-08-14",
        maxScore: null,
        participantCount: 30,
      };

      const summary = formatExamSummary(examWithNull);
      expect(summary).toBe("14 Ağustos 2026 · 30 katılımcı");
      expect(summary).not.toContain("üzerinden");
    });

    it("katılımcı sayısı bilinmiyorken 'katılımcı' ibaresi üretilmez, 0 da yazılmaz (K-22)", () => {
      const examWithoutCount: LatestExamDetail = {
        id: "exam-3",
        name: "TYT Deneme 06",
        examDate: "2026-08-14",
        maxScore: 100,
        participantCount: null,
      };

      const summary = formatExamSummary(examWithoutCount);
      expect(summary).toBe("14 Ağustos 2026 · 100 üzerinden");
      expect(summary).not.toContain("katılımcı");
      // ⛔ "0 katılımcı" bir iddiadır: sınava kimsenin girmediğini söyler.
      expect(summary).not.toContain("0 katılımcı");
    });
  });

  describe("mapLatestExamRow", () => {
    it("sınav satırını eşler, sayı dönüşümünü yapar ve katılımcı sayısını dışarıdan alır", () => {
      const mapped = mapLatestExamRow(
        {
          id: "exam-1",
          name: "TYT Deneme 01",
          exam_date: "2026-09-01",
          max_score: "100.00", // PostgREST dizge döner
        },
        54
      );

      expect(mapped.id).toBe("exam-1");
      expect(mapped.name).toBe("TYT Deneme 01");
      expect(mapped.examDate).toBe("2026-09-01");
      expect(mapped.maxScore).toBe(100);
      expect(mapped.participantCount).toBe(54);
    });

    it("max_score null olduğunda null döner", () => {
      const mapped = mapLatestExamRow(
        {
          id: "exam-2",
          name: "Mini Test",
          exam_date: "2026-09-02",
          max_score: null,
        },
        null
      );

      expect(mapped.maxScore).toBeNull();
      expect(mapped.participantCount).toBeNull();
    });

    // ⛔ Satırla birlikte gelen `exam_results` dizisi çağıranın yetkisiyle
    // süzülmüştür; uzunluğu sınava kaç kişinin girdiğini DEĞİL, okuyanın kaç
    // satır görebildiğini ölçer. Biri onu yeniden okumaya kalkarsa bu test düşer.
    it("satıra iliştirilmiş exam_results dizisini katılımcı sayısı olarak KULLANMAZ", () => {
      const mapped = mapLatestExamRow(
        {
          id: "exam-4",
          name: "Kurum Geneli Deneme",
          exam_date: "2026-09-07",
          max_score: 100,
          // Öğrencinin göreceği hali: üç kişi girdi ama tek satır okunabiliyor.
          exam_results: [{ id: "res-1" }],
        } as Parameters<typeof mapLatestExamRow>[0],
        3
      );

      expect(mapped.participantCount).toBe(3);
    });
  });

  describe("loadExamParticipantCount (RPC exam_participant_count)", () => {
    it("sayıyı fonksiyondan okur; exam_results satırı saymaz", async () => {
      rpcMock.mockResolvedValue({ data: 54, error: null });

      const count = await loadExamParticipantCount("exam-1");

      expect(count).toBe(54);
      expect(rpcMock).toHaveBeenCalledWith("exam_participant_count", {
        target_exam_id: "exam-1",
      });
      expect(fromMock).not.toHaveBeenCalledWith("exam_results");
      expect(rpcMock).not.toHaveBeenCalledWith(
        "exam_ranking",
        expect.anything()
      );
    });

    it("PostgREST bigint'i dizge verdiğinde de sayıya çevirir", async () => {
      rpcMock.mockResolvedValue({ data: "54", error: null });
      await expect(loadExamParticipantCount("exam-1")).resolves.toBe(54);
    });

    it("yetkisiz çağırana fonksiyon null döner; sayı uydurulmaz, 0 yazılmaz (K-22)", async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });
      await expect(loadExamParticipantCount("exam-1")).resolves.toBeNull();
    });

    it("sorgu hatasında null döner, 0 değil (K-04)", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });
      await expect(loadExamParticipantCount("exam-1")).resolves.toBeNull();
    });
  });

  describe("loadStudentLatestExamScores (RPC student_latest_exam_scores & 2.A/2.C)", () => {
    it("boş öğrenci listesinde veritabanına sorgu atmadan boş map döner", async () => {
      const result = await loadStudentLatestExamScores([]);
      expect(result.size).toBe(0);
      expect(rpcMock).not.toHaveBeenCalled();
      expect(fromMock).not.toHaveBeenCalled();
    });

    it("PostgREST'ten DİZGE gelen puanları sayıya çevirir ve tek seferde çeker", async () => {
      rpcMock.mockResolvedValue({
        data: [
          // PostgREST numeric sütunları canlıda "84.00" gibi dizge döner
          { student_id: "stu-1", score: "84.00" },
          { student_id: "stu-2", score: "72.50" },
          { student_id: "stu-3", score: "0.00" }, // 0 geçerli bir puandır
        ],
        error: null,
      });

      const map = await loadStudentLatestExamScores([
        "stu-1",
        "stu-2",
        "stu-3",
        "stu-4", // sınav sonucu olmayan öğrenci
      ]);

      expect(rpcMock).toHaveBeenCalledTimes(1);
      expect(rpcMock).toHaveBeenCalledWith("student_latest_exam_scores", {
        target_student_ids: ["stu-1", "stu-2", "stu-3", "stu-4"],
      });

      // ⛔ ENGELLEYİCİ KONTROLLER
      // 1. exam_results tablosuna doğrudan sorgu GİTMEZ
      expect(fromMock).not.toHaveBeenCalledWith("exam_results");
      // 2. exam_ranking SIRALAMA fonksiyonu çağrılmaz (2.B)
      expect(rpcMock).not.toHaveBeenCalledWith(
        "exam_ranking",
        expect.anything()
      );

      // Sayı dönüşüm doğrulaması
      expect(map.get("stu-1")).toBe(84);
      expect(typeof map.get("stu-1")).toBe("number");
      expect(map.get("stu-2")).toBe(72.5);
      expect(map.get("stu-3")).toBe(0);

      // K-22: Sınavı olmayan öğrencinin puanı undefined kalır, 0 uydurulmaz
      expect(map.get("stu-4")).toBeUndefined();
    });

    it("veritabanı hatasında fail-closed davranır ve boş map döner (K-04)", async () => {
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "database timeout" },
      });

      const map = await loadStudentLatestExamScores(["stu-1"]);
      expect(map.size).toBe(0);
      expect(fromMock).not.toHaveBeenCalledWith("exam_results");
    });
  });

  describe("loadLatestExam (Sınav Başlığı & 2.E)", () => {
    it("en son aktif sınavı tarih ve id azalan sırayla çeker ve arşivliyi eler", async () => {
      const spy: {
        selectArg?: string;
        isArgs?: [string, unknown];
        orderArgs?: [string, { ascending?: boolean }][];
        limitArg?: number;
      } = {};

      fromMock.mockReturnValue(
        createQueryChain(
          {
            data: [
              {
                id: "exam-latest",
                name: "TYT Deneme 06",
                exam_date: "2026-08-14",
                max_score: "100.00",
              },
            ],
            error: null,
          },
          spy
        )
      );
      rpcMock.mockResolvedValue({ data: "54", error: null });

      const result = await loadLatestExam();

      expect(fromMock).toHaveBeenCalledWith("exams");
      // ⛔ exam_results tablosuna doğrudan sorgu atılmaz
      expect(fromMock).not.toHaveBeenCalledWith("exam_results");
      expect(rpcMock).not.toHaveBeenCalledWith(
        "exam_ranking",
        expect.anything()
      );
      // ⛔ Ve gömülü olarak da çekilmez: gömülü dizi RLS ile süzülür, uzunluğu
      // katılımcı sayısı değildir. Sayı fonksiyondan gelir.
      expect(spy.selectArg).not.toContain("exam_results");
      expect(rpcMock).toHaveBeenCalledWith("exam_participant_count", {
        target_exam_id: "exam-latest",
      });

      expect(spy.isArgs).toEqual(["archived_at", null]);
      expect(spy.orderArgs).toEqual([
        ["exam_date", { ascending: false }],
        ["id", { ascending: false }],
      ]);
      expect(spy.limitArg).toBe(1);

      expect(result.exam).not.toBeNull();
      expect(result.exam?.id).toBe("exam-latest");
      expect(result.exam?.name).toBe("TYT Deneme 06");
      expect(result.exam?.participantCount).toBe(54);
      expect(result.exam?.maxScore).toBe(100);
    });

    it("katılımcı sayısı alınamazsa sınav yine çizilir, sayı null kalır (K-04)", async () => {
      fromMock.mockReturnValue(
        createQueryChain({
          data: [
            {
              id: "exam-latest",
              name: "TYT Deneme 06",
              exam_date: "2026-08-14",
              max_score: "100.00",
            },
          ],
          error: null,
        })
      );
      rpcMock.mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });

      const result = await loadLatestExam();

      expect(result.exam?.name).toBe("TYT Deneme 06");
      expect(result.exam?.participantCount).toBeNull();
    });

    it("aktif sınav yoksa exam: null döner ve katılımcı sayısı hiç sorulmaz (K-03)", async () => {
      fromMock.mockReturnValue(
        createQueryChain({
          data: [],
          error: null,
        })
      );

      const result = await loadLatestExam();
      expect(result.exam).toBeNull();
      expect(rpcMock).not.toHaveBeenCalled();
    });

    it("veritabanı hatasında anlamlı Türkçe hata fırlatır", async () => {
      fromMock.mockReturnValue(
        createQueryChain({
          data: null,
          error: { message: "connection timeout" },
        })
      );

      await expect(loadLatestExam()).rejects.toThrow(
        "Sınav bilgisi yüklenemedi."
      );
    });
  });

  describe("AssessmentsPage UI davranışları (K-22 & Üretimde Çizilmeyenler)", () => {
    it("üretimde sınav başlığı ve katılımcı sayısı çizilir, kaynağı olmayan alanlar çizilmez (K-22)", () => {
      const exam: LatestExamDetail = {
        id: "exam-1",
        name: "TYT Deneme 06",
        examDate: "2026-08-14",
        maxScore: 100,
        participantCount: 54,
      };

      const element = AssessmentsPage({
        role: "admin",
        onNavigate: vi.fn(),
        exam,
        isDemo: false,
      });

      const elementString = JSON.stringify(element);

      // Bağlanan ikisi:
      expect(elementString).toContain("TYT Deneme 06");
      expect(elementString).toContain(
        "14 Ağustos 2026 · 54 katılımcı · 100 üzerinden"
      );
      expect(elementString).toContain("Kayıtlı Sınav");
      expect(elementString).toContain(
        "Sınav sonuç girişi ve detaylı analizler v1.4 sürümünde açılacaktır"
      );

      // ⛔ ÜRETİMDE ÇİZİLMEYECEK ALANLAR (K-22):
      // 1. "Odak alan: Geometri"
      expect(elementString).not.toContain("Odak alan: Geometri");
      // 2. Tavsiye metinleri ("Takip önerisi")
      expect(elementString).not.toContain("Takip önerisi");
      expect(elementString).not.toContain(
        "Geometri konularında kısa tekrar ve soru çözüm etüdü öneriliyor."
      );
      // 3. Ders ortalaması "Matematik 82"
      expect(elementString).not.toContain("Matematik 82");
      // 4. "+6 · Önceki denemeye göre"
      expect(elementString).not.toContain("Önceki denemeye göre");
      // 5. Yazma aksiyonu (Sonuç gir butonu) üretimde devre dışıdır
      expect(elementString).not.toContain("Sonuç gir");
    });

    it("üretimde max_score null iken 'üzerinden' ibaresi kesinlikle çizilmez (K-22, K-03)", () => {
      const exam: LatestExamDetail = {
        id: "exam-2",
        name: "Kazanım Testi",
        examDate: "2026-08-14",
        maxScore: null,
        participantCount: 20,
      };

      const element = AssessmentsPage({
        role: "teacher",
        onNavigate: vi.fn(),
        exam,
        isDemo: false,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain("14 Ağustos 2026 · 20 katılımcı");
      expect(elementString).not.toContain("üzerinden");
    });

    it("üretimde katılımcı sayısı bilinmiyorken sınav yine çizilir, sayı çizilmez (K-22)", () => {
      const exam: LatestExamDetail = {
        id: "exam-3",
        name: "Kurum Geneli Deneme",
        examDate: "2026-09-07",
        maxScore: 100,
        participantCount: null,
      };

      const element = AssessmentsPage({
        role: "student",
        onNavigate: vi.fn(),
        exam,
        isDemo: false,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain("Kurum Geneli Deneme");
      expect(elementString).toContain("7 Eylül 2026 · 100 üzerinden");
      // ⛔ Öğrenciye "1 katılımcı" ya da "0 katılımcı" gösterilmez: ikisi de
      // sistemin bilmediği bir şeyi biliyormuş gibi söylerdi.
      expect(elementString).not.toContain("katılımcı");
    });

    it("üretimde sınav kaydı yoksa 'Henüz sınav kaydı yok' boş durumunu gösterir (K-03)", () => {
      const element = AssessmentsPage({
        role: "admin",
        onNavigate: vi.fn(),
        exam: null,
        isDemo: false,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain("Henüz sınav kaydı yok");
      expect(elementString).not.toContain("TYT Deneme 06");
    });

    it("demo modunda tüm demo istatistikleri ve öneri kartları çizilir", () => {
      const element = AssessmentsPage({
        role: "admin",
        onNavigate: vi.fn(),
        isDemo: true,
      });

      const elementString = JSON.stringify(element);
      expect(elementString).toContain("TYT Deneme 06");
      expect(elementString).toContain("Yayınlandı");
      expect(elementString).toContain("Takip önerisi");
      expect(elementString).toContain("Konu bazlı görünüm");
      expect(elementString).toContain("Sonuç gir");
    });
  });
});
