import { supabase } from "@/lib/supabaseClient";

/**
 * Sınav servis katmanı (v1.3-01 · D parçası).
 *
 * `exams` ve `exam_results` tablolarını gerçek Supabase servisine bağlar.
 *
 * =========================================================================
 * ⛔ İki okuma yolu var, birbirinin yerine geçmez (DECISION_LOG)
 * =========================================================================
 *
 * - `exam_ranking(uuid)`: SIRALAMA yolu. `security definer`, satır bazında
 *   maskeleme yapar, yetkisiz isimleri `null`'lar. Bu parçada KULLANILMAZ.
 * - `student_latest_exam_scores(uuid[])`: LİSTE yolu. Maskeleme YOKTUR;
 *   RLS doğrudan uygulanır ve çağıran yalnız yetkili olduğu satırları alır.
 *
 * =========================================================================
 * Neden veritabanı fonksiyonu (student_latest_exam_scores)
 * =========================================================================
 *
 * "Son sınav" bir seçimdir (distinct on). İstemcide ham `exam_results` satırları
 * çekilip istemcide seçilmeye kalkışılırsa, kaçınılmaz bir satır üst sınırı
 * (tavan) konmak zorunda kalınır. Bu sessiz tavan aşıldığında eksik satır kümesinden
 * seçilen sınav gerçekten son olmayabilir ve kullanıcıya yanlış sınavın puanı
 * yetkili görünen bir sayı gibi sunulur (K-03).
 *
 * Fonksiyon öğrenci başına tek satır döndürür; kaç sonuç olursa olsun sonuç
 * kümesi öğrenci sayısı kadardır. Arşivlenmiş sınavlar veritabanında elenir.
 *
 * =========================================================================
 * Sayılar PostgREST'ten DİZGE gelir
 * =========================================================================
 *
 * PostgREST `numeric` ve `bigint` sütunlarını JSON'a string olarak koyar (ör. `"84.00"`).
 * Değerler `Number(...)` ile çevrilir.
 *
 * =========================================================================
 * Yokluk etiketi de bir iddiadır (K-22)
 * =========================================================================
 *
 * Puanı olmayan öğrenci için değer `undefined` kalır; kesinlikle `0` verilmez.
 * `max_score` boş (null) olduğunda "100 üzerinden" gibi uydurulmuş ibareler
 * üretilmez.
 *
 * =========================================================================
 * ⛔ Katılımcı sayısı, GÖRÜLEBİLEN satır sayısı DEĞİLDİR
 * =========================================================================
 *
 * İlk yazımda katılımcı sayısı `exams` sorgusuna gömülen `exam_results (id)`
 * dizisinin uzunluğundan geliyordu. `exam_results` üzerindeki RLS satır
 * bazlıdır, dolayısıyla o uzunluk sınava kaç kişinin girdiğini değil
 * **çağıranın kaç satır görmeye yetkili olduğunu** ölçüyordu.
 *
 * Canlıda ölçüldü (2026-09-08): üç kişinin girdiği bir denemede yönetici 3,
 * öğretmen 2, öğrenci 1 satır görüyor. Öğrenci ve veli için sayı **her zaman
 * 1**, sınava girmemiş biri için **her zaman 0** olurdu.
 *
 * Sayı artık `exam_participant_count(uuid)` veritabanı fonksiyonundan gelir.
 * Yetkisiz çağırana `null` döner ve o durumda ibare **hiç çizilmez** (K-22).
 */

export type LatestExamDetail = {
  id: string;
  name: string;
  examDate: string;
  maxScore: number | null;
  /**
   * Sınava giren kişi sayısı — sınavın kendi sayısı, okuyanın gördüğü değil.
   * Çağıranın bu sayıyı görmeye yetkisi yoksa `null` kalır ve çizilmez.
   */
  participantCount: number | null;
};

export type LatestExamResult = {
  exam: LatestExamDetail | null;
};

const TR_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * Sınav tarihini Türkçe arayüz formatına çevirir (ör. "14 Ağustos 2026").
 */
export function formatExamDate(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;

  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const monthName = TR_MONTHS[monthIdx] || parts[1];
  return `${day} ${monthName} ${year}`;
}

/**
 * Sınav başlık alt metnini oluşturur (v1.3-01d · 2.E).
 *
 * Örnek (ikisi de dolu): "14 Ağustos 2026 · 54 katılımcı · 100 üzerinden"
 * Örnek (max_score boş): "14 Ağustos 2026 · 54 katılımcı"
 * Örnek (sayı yetkisiz): "14 Ağustos 2026 · 100 üzerinden"
 *
 * ⚠️ Boş olan hiçbir alan için ibare üretilmez (K-22, K-03): `max_score`
 * bilinmiyorsa "üzerinden", katılımcı sayısı bilinmiyorsa "katılımcı" yazılmaz.
 * Bilinmeyen bir sayı yerine `0` yazmak da bir iddiadır — susmak değildir.
 */
export function formatExamSummary(exam: LatestExamDetail): string {
  const parts: string[] = [];
  const dt = formatExamDate(exam.examDate);
  if (dt) {
    parts.push(dt);
  }

  if (exam.participantCount !== null && exam.participantCount !== undefined) {
    parts.push(`${exam.participantCount} katılımcı`);
  }

  if (exam.maxScore !== null && exam.maxScore !== undefined) {
    parts.push(`${exam.maxScore} üzerinden`);
  }

  return parts.join(" · ");
}

type RawLatestExamRow = {
  id: string;
  name: string;
  exam_date: string;
  max_score?: number | string | null;
  archived_at?: string | null;
};

/**
 * Sınav satırını arayüz nesnesine çevirir.
 *
 * Katılımcı sayısı **dışarıdan** verilir çünkü satırdan okunamaz: satırla
 * birlikte gelen `exam_results` dizisi çağıranın yetkisiyle süzülmüştür.
 * Sayı bilinmiyorsa `null` geçilir ve arayüz o ibareyi hiç çizmez (K-22).
 */
export function mapLatestExamRow(
  row: RawLatestExamRow,
  participantCount: number | null
): LatestExamDetail {
  let maxScore: number | null = null;
  if (row.max_score !== null && row.max_score !== undefined) {
    const parsed = Number(row.max_score);
    if (!Number.isNaN(parsed)) {
      maxScore = parsed;
    }
  }

  return {
    id: row.id,
    name: row.name,
    examDate: row.exam_date,
    maxScore,
    participantCount,
  };
}

/**
 * Öğrencilerin en son sınav puanlarını toplu olarak çeker (v1.3-01d · 2.A & 2.C).
 *
 * `student_latest_exam_scores` veritabanı fonksiyonu üzerinden tek sorgu atılır (K-06).
 * İstemcide satır sayımı ve seçim yapılmaz.
 *
 * PostgREST'ten dizge olarak gelen puanlar (`"84.00"`) sayıya çevrilir.
 * Puanı olmayan öğrenciler map'te yer almaz (`undefined` döner, K-22).
 */
export async function loadStudentLatestExamScores(
  studentIds: string[]
): Promise<Map<string, number>> {
  const uniqueIds = Array.from(
    new Set(studentIds.filter(id => Boolean(id) && typeof id === "string"))
  );
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("student_latest_exam_scores", {
    target_student_ids: uniqueIds,
  });

  if (error || !data) {
    // Fail-closed (K-04): Veritabanı hatasında uydurma puan üretilmez
    return new Map();
  }

  const resultMap = new Map<string, number>();

  for (const row of data as {
    student_id: string;
    score: number | string;
  }[]) {
    const studentId = row.student_id;
    if (!studentId) continue;

    const parsed = Number(row.score);
    if (!Number.isNaN(parsed)) {
      resultMap.set(studentId, parsed);
    }
  }

  return resultMap;
}

/**
 * Bir sınava kaç kişinin girdiğini çeker (v1.3-01d · 2.E).
 *
 * ⛔ Bu sayı `exam_results` satırları sayılarak bulunamaz: o tablodaki RLS
 * satır bazlıdır ve sayı role göre değişirdi (öğrenci her sınavda "1
 * katılımcı" görürdü). Sayım `exam_participant_count(uuid)` fonksiyonunda,
 * `security definer` altında yapılır.
 *
 * Çağıranın sayıyı görmeye yetkisi yoksa fonksiyon `null` döner — `0` değil,
 * çünkü `0` "bu sınava kimse girmedi" demektir ve bu bir iddiadır (K-22).
 * Sorgu hatasında da `null` döner (K-04): sayı üretilmez, ibare çizilmez.
 */
export async function loadExamParticipantCount(
  examId: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc("exam_participant_count", {
    target_exam_id: examId,
  });

  if (error || data === null || data === undefined) {
    return null;
  }

  // PostgREST `bigint` değerini dizge olarak da verebilir ("54").
  const parsed = Number(data);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Aktif kurumun en son aktif sınavını ve katılımcı sayısını çeker (v1.3-01d · 2.E).
 *
 * ⚠️ Arşiv filtresi: `exam_results` tablosunda `archived_at` yoktur;
 * filtre `exams` tablosu üzerinde `archived_at is null` olarak uygulanır.
 *
 * Sınav yoksa `{ exam: null }` döner (K-03: uydurulmuş sınav yok).
 */
export async function loadLatestExam(): Promise<LatestExamResult> {
  const { data, error } = await supabase
    .from("exams")
    .select(
      `
      id,
      name,
      exam_date,
      max_score,
      archived_at
    `
    )
    .is("archived_at", null)
    .order("exam_date", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error("Sınav bilgisi yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawLatestExamRow[];
  if (rawRows.length === 0) {
    return { exam: null };
  }

  const participantCount = await loadExamParticipantCount(rawRows[0].id);

  return {
    exam: mapLatestExamRow(rawRows[0], participantCount),
  };
}
