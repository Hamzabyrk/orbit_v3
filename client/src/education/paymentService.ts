import { supabase } from "@/lib/supabaseClient";
import type { PaymentRow } from "@/components/education/types";
import { formatTrDate } from "./trDate";

/**
 * Ödeme servis katmanı (v1.3-01 · E parçası).
 *
 * `payment_plans` ve `installments` tablolarını gerçek Supabase servisine bağlar.
 *
 * =========================================================================
 * ⛔ Veritabanı fonksiyonları (RPC) kullanılır, istemcide sayım yapılmaz
 * =========================================================================
 *
 * `Student.payment` ve ödeme ekranının durum rozeti "vadesi geçmiş ödenmemiş taksit
 * var mı" sorusunun cevabıdır. `installments` tablosundan satır çekip istemcide
 * saymaya kalkışılırsa sessiz bir satır tavanı (limit) konmak zorunda kalınır.
 *
 * C parçasında aynı tuzak engelleyici bulgu oldu (v1.3-12): tavan aşıldığında
 * vadesi geçmiş taksit görülemez ve sistem borçlu bir öğrenciyi "Güncel"
 * gösterirdi. Veliye "borcunuz yok" demek geri alınması güç bir hatadır (K-03).
 *
 * =========================================================================
 * ⛔ Neden security definer DEĞİL — Ödeme en dar kapsamlı veridir
 * =========================================================================
 *
 * `payment_plans` ve `installments` üzerindeki RLS ödemeyi yalnızca yöneticiye
 * ve veliye açar (v1.2-06 kararı: "ödeme, kurum ile aile arasındadır ve öğretmenin
 * işi değildir"). Öğretmen ve öğrencinin kendisi ödeme verisini göremez.
 *
 * Çağıranın hakları geçerli kalır: öğretmen ve öğrenci boş küme alır.
 * Boş küme kesinlikle "Güncel"e çevrilmez; rozet hiç çizilmez (K-22).
 *
 * =========================================================================
 * Sayılar PostgREST'ten DİZGE gelir
 * =========================================================================
 *
 * PostgREST numeric ve bigint sütunlarını JSON'a string olarak koyar ("1500.00", "1").
 * Değerler `Number(...)` ile çevrilir.
 *
 * =========================================================================
 * Durum kuralı — İki değer, üç değil (Arda Bülent kararı 2026-09-09)
 * =========================================================================
 *
 * overdue_count > 0  → "Takip gerekli"
 * overdue_count = 0  → "Güncel"
 * satır yok          → undefined (rozet çizilmez)
 *
 * Demo'daki "Hatırlatma gerekli" ve "Gecikme riski" üretimde çizilmez.
 */

export const DEFAULT_PAYMENT_LIMIT = 100;

export type PaymentListResult = {
  rows: PaymentRow[];
  truncated: boolean;
};

export type RawPaymentPlanRow = {
  id: string;
  name: string;
  student_id: string;
  archived_at?: string | null;
  created_at?: string;
  students?: { full_name: string } | { full_name: string }[] | null;
};

export type PaymentPlanSummary = {
  planId: string;
  overdueCount: number;
  nextDueDate: string | null;
  nextDueAmount: number | null;
};

export type PaymentOverviewCounts = {
  collectedThisMonth: number;
  upcomingCount: number;
  overdueCount: number;
};

/**
 * Tutarı Türk Lirası para birimi formatına çevirir (ör. 7200 -> "₺7.200").
 * Demo ve üretim arayüzlerinde tek formatlayıcı olarak kullanılır (K-06).
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "";
  }
  const formatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(amount);
  return `₺${formatted}`;
}

/**
 * İlişkili öğrenci kaydından öğrenci adını güvenle çıkarır.
 */
export function extractStudentName(students: unknown): string {
  if (!students) return "";
  if (Array.isArray(students)) {
    return students[0]?.full_name || "";
  }
  if (typeof students === "object" && "full_name" in students) {
    return (students as { full_name: string }).full_name || "";
  }
  return "";
}

/**
 * Veritabanı plan satırını ve özetini arayüz satırına (PaymentRow) eşler.
 *
 * Taksiti hiç olmayan planda next_due_date ve next_due_amount null döner.
 * Boş sütunlara "0" ya da "—" yazılmaz, boş dizge bırakılır (K-22).
 */
export function mapPaymentRow(
  plan: RawPaymentPlanRow,
  summary?: PaymentPlanSummary
): PaymentRow {
  const studentName = extractStudentName(plan.students);

  let due = "";
  if (summary?.nextDueDate) {
    due = formatTrDate(summary.nextDueDate);
  }

  let amount = "";
  if (summary?.nextDueAmount !== null && summary?.nextDueAmount !== undefined) {
    amount = formatCurrency(summary.nextDueAmount);
  }

  let status: PaymentRow["status"] = undefined;
  if (summary) {
    status = summary.overdueCount > 0 ? "Takip gerekli" : "Güncel";
  }

  return {
    student: studentName,
    plan: plan.name,
    due,
    amount,
    status,
  };
}

/**
 * Plan ID'leri için vadesi geçmiş taksit sayısı ve en erken ödenmemiş taksiti tek seferde çeker.
 *
 * ⛔ installments tablosuna doğrudan sorgu atılmaz; sayım ve sıralama
 * `payment_plan_summaries` veritabanı fonksiyonunda yapılır (K-03).
 */
export async function loadPaymentPlanSummaries(
  planIds: string[]
): Promise<Map<string, PaymentPlanSummary>> {
  const uniqueIds = Array.from(
    new Set(planIds.filter(id => Boolean(id) && typeof id === "string"))
  );
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("payment_plan_summaries", {
    target_plan_ids: uniqueIds,
  });

  if (error || !data) {
    // Fail-closed (K-04): Veritabanı hatasında uydurma özet üretilmez
    return new Map();
  }

  const resultMap = new Map<string, PaymentPlanSummary>();

  for (const row of data as {
    plan_id: string;
    overdue_count: number | string;
    next_due_date: string | null;
    next_due_amount: number | string | null;
  }[]) {
    const planId = row.plan_id;
    if (!planId) continue;

    const overdueCount = Number(row.overdue_count);
    let nextDueAmount: number | null = null;
    if (row.next_due_amount !== null && row.next_due_amount !== undefined) {
      const parsedAmount = Number(row.next_due_amount);
      if (!Number.isNaN(parsedAmount)) {
        nextDueAmount = parsedAmount;
      }
    }

    resultMap.set(planId, {
      planId,
      overdueCount: Number.isNaN(overdueCount) ? 0 : overdueCount,
      nextDueDate: row.next_due_date || null,
      nextDueAmount,
    });
  }

  return resultMap;
}

/**
 * Aktif kurumun ödeme planlarını listeler ve özetleriyle birleştirir (v1.3-01 · E parçası).
 *
 * Kapsam sorgulanmaz (RLS ile çözülür).
 * Arşiv filtresi zorunludur: `archived_at is null`.
 */
export async function loadPayments(
  limit = DEFAULT_PAYMENT_LIMIT
): Promise<PaymentListResult> {
  const { data, error } = await supabase
    .from("payment_plans")
    .select(
      `
      id,
      name,
      student_id,
      students ( full_name ),
      archived_at,
      created_at
    `
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Ödeme listesi yüklenemedi.");
  }

  const rawRows = (data ?? []) as RawPaymentPlanRow[];
  const planIds = rawRows.map(row => row.id).filter(Boolean);

  const summaries = await loadPaymentPlanSummaries(planIds);
  const rows = rawRows.map(row => mapPaymentRow(row, summaries.get(row.id)));

  return {
    rows,
    truncated: rows.length === limit,
  };
}

/**
 * Öğrencilerin ödeme durumlarını toplu olarak çeker (v1.3-01e · 3.B & 3.C).
 *
 * `student_payment_summaries` veritabanı fonksiyonu üzerinden tek sorgu atılır (K-06).
 * İstemcide satır sayımı ve tavan filtreleri yapılmaz.
 *
 * Satır dönmesi "görülebilir bir ödeme planı var" demektir:
 * - overdue_count > 0  → "Takip gerekli"
 * - overdue_count = 0  → "Güncel"
 * - Planı olmayan veya yetkisi olmayan öğrenci çıktıda yer almaz (undefined, K-22).
 */
export async function loadStudentPaymentStatuses(
  studentIds: string[]
): Promise<Map<string, "Güncel" | "Takip gerekli">> {
  const uniqueIds = Array.from(
    new Set(studentIds.filter(id => Boolean(id) && typeof id === "string"))
  );
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.rpc("student_payment_summaries", {
    target_student_ids: uniqueIds,
  });

  if (error || !data) {
    // Fail-closed (K-04): Veritabanı hatasında durum üretilmez
    return new Map();
  }

  const resultMap = new Map<string, "Güncel" | "Takip gerekli">();

  for (const row of data as {
    student_id: string;
    overdue_count: number | string;
  }[]) {
    const studentId = row.student_id;
    if (!studentId) continue;

    const overdueCount = Number(row.overdue_count);
    if (Number.isNaN(overdueCount)) continue;

    const status = overdueCount > 0 ? "Takip gerekli" : "Güncel";
    resultMap.set(studentId, status);
  }

  return resultMap;
}

/**
 * Ödeme ekranının yönetici istatistik sayılarını çeker (v1.3-01e · 3.E).
 *
 * `payment_overview_counts` veritabanı fonksiyonu kullanılır.
 * Fonksiyon görebildiği taksit olmayan veya yetkisi olmayan çağırana
 * HİÇ SATIR döndürmez (having count(*) > 0).
 *
 * Boş satır kümesinde null döner; sıfırlar uydurulmaz (K-03, K-22).
 */
export async function loadPaymentOverviewCounts(): Promise<PaymentOverviewCounts | null> {
  const { data, error } = await supabase.rpc("payment_overview_counts");

  if (error || !data) {
    return null;
  }

  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) {
    return null;
  }

  const row = rows[0] as {
    collected_this_month?: number | string | null;
    upcoming_count?: number | string | null;
    overdue_count?: number | string | null;
  };

  if (!row) {
    return null;
  }

  const collected = Number(row.collected_this_month ?? 0);
  const upcoming = Number(row.upcoming_count ?? 0);
  const overdue = Number(row.overdue_count ?? 0);

  return {
    collectedThisMonth: Number.isNaN(collected) ? 0 : collected,
    upcomingCount: Number.isNaN(upcoming) ? 0 : upcoming,
    overdueCount: Number.isNaN(overdue) ? 0 : overdue,
  };
}
