import { supabase } from "@/lib/supabaseClient";

/**
 * Kurum denetim kaydı servisi (#149, v1.2-12).
 *
 * `audit_events` Faz E'den beri yazılıyor ama **hiçbir istemci kodu okumuyordu**.
 * Politika (`audit_events_select_admin`) var olmayan bir okuyucu için yazılmıştı.
 * Bu modül o okuyucudur.
 *
 * Neden önemli: "Rol, atama ve bağlantı üç ayrı kavramdır" kararı, yönetici-veli
 * çıkar çatışmasının karşılığını **erişimi kısıtlamak değil izlenebilirlik**
 * olarak koymuştu — "kaydın kim tarafından yapıldığı görünmelidir". Yazma tarafı
 * vardı, görünme tarafı yoktu; karar yarım uygulanmış duruyordu.
 *
 * **Kapsam sorgulanmıyor.** `organization_id` filtresi bilinçli olarak yok: RLS
 * zaten yalnızca çağıranın kurumunun satırlarını döndürüyor. Burada ikinci kez
 * filtrelemek, v1.2-10'da kaldırılan çift kaynağın aynısı olurdu (K-06).
 */

export type AuditActor =
  | { kind: "member"; name: string }
  | { kind: "outside" }
  | { kind: "system" }
  | { kind: "unresolved" };

export type OrganizationAuditEvent = {
  id: number;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
};

type AuditRow = {
  id: number;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

/**
 * Aktörü dört durumdan birine çözer.
 *
 * Dört olmasının sebebi K-09: "okunamadı" ile "yok" aynı cevap değildir ve
 * ikisini tek bir `string | null` alanında tutmak, ekranı yanlış konuşmaya
 * zorlar. Burada üç ayrı bilinmezlik var ve üçü farklı şeyler söylüyor:
 *
 *   * `system`   — kaydın aktörü hiç yazılmamış (`actor_user_id is null`).
 *   * `outside`  — isim sorgusu **başarılı** ama bu kimlik dönmedi. Bu bir
 *     tahmin değil **mantıksal kesinlik**: `profiles_select_organization_admin`
 *     tam olarak yöneticinin kendi kurumundaki kişileri döndürür, dolayısıyla
 *     dönmemesi "bu kişi bu kurumun üyesi değil" demektir. Pratikte kurumu
 *     kuran platform operatörü.
 *   * `unresolved` — isim sorgusu **başarısız**. Burada hiçbir şey iddia
 *     edilemez; ekran "kurum dışı" derse yalan söylemiş olur.
 */
export function resolveAuditActor(
  actorUserId: string | null,
  names: Map<string, string> | null
): AuditActor {
  if (actorUserId === null) {
    return { kind: "system" };
  }

  if (names === null) {
    return { kind: "unresolved" };
  }

  const name = names.get(actorUserId);

  return name === undefined ? { kind: "outside" } : { kind: "member", name };
}

/**
 * `action` ve `entity_type` değerlerinin Türkçe karşılıkları.
 *
 * ⚠️ Bu iki tablo, Edge Function'lardaki dize sabitlerinin **ikizidir** (K-06).
 * Orada yeni bir eylem yazıldığında burası güncellenmezse ekran ham kodu
 * gösterir — uydurma bir etiket üretmez (K-03). Bozulma biçimi bilinçli
 * seçildi: ham kod çirkin ama doğru, uydurulmuş etiket güzel ama yanlış olurdu.
 */
const ACTION_LABELS: Record<string, string> = {
  "organization.bootstrap": "Kurum kuruldu",
  "membership.created": "Üye eklendi",
  "membership.password_reset": "Şifre sıfırlandı",
  "student.created": "Öğrenci eklendi",
  "student.updated": "Öğrenci güncellendi",
  "student.archived": "Öğrenci arşivlendi",
  "student.restored": "Öğrenci geri yüklendi",
  "student.account_linked": "Öğrenci hesabı bağlandı",
  "student.account_unlinked": "Öğrenci hesap bağı çözüldü",
  "guardian.account_linked": "Veli hesabı bağlandı",
  "guardian.account_unlinked": "Veli hesap bağı çözüldü",
  "class.created": "Sınıf eklendi",
  "class.updated": "Sınıf güncellendi",
  "class.archived": "Sınıf arşivlendi",
  "class.restored": "Sınıf geri yüklendi",
  "class_enrollment.created": "Sınıfa öğrenci kaydedildi",
  "class_enrollment.archived": "Öğrencinin sınıf kaydı sonlandırıldı",
  "class_enrollment.restored": "Öğrencinin sınıf kaydı geri yüklendi",
  "attendance_session.created": "Yoklama oturumu açıldı",
  "attendance_session.updated": "Yoklama oturumu güncellendi",
  "attendance_session.archived": "Yoklama oturumu arşivlendi",
  "attendance_session.restored": "Yoklama oturumu geri yüklendi",
  "attendance_record.updated": "Yoklama kaydı güncellendi",
};

const ENTITY_LABELS: Record<string, string> = {
  organization: "Kurum",
  organization_membership: "Üyelik",
  student: "Öğrenci",
  guardian: "Veli",
  class: "Sınıf",
  class_enrollment: "Sınıf Kaydı",
  attendance_session: "Yoklama Oturumu",
  attendance_record: "Yoklama Kaydı",
};

export function describeAuditAction(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function describeAuditEntity(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

/**
 * Kaydın zamanını okunur hâle getirir; çözülemeyen bir tarihte **hiçbir şey**
 * göstermez (K-03). `NaN` veya "Invalid Date" basmaktansa boş bırakmak doğru.
 */
export function formatAuditMoment(value: string): string | null {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * İsimleri ayrı sorguluyor.
 *
 * Gömülü join (`profiles(...)`) burada çalışmaz: `audit_events.actor_user_id`
 * `auth.users`'a bakıyor, `public.profiles`'a değil; PostgREST ilişkiyi göremez.
 * Aynı gerekçe `platformService.loadDisplayNames`'te de yazılı.
 *
 * Hata durumunda **boş harita değil `null`** dönüyor. Boş harita dönseydi
 * çağıran, "sorgu başarılı ama kimse bulunamadı" ile "sorgu başarısız"ı
 * ayırt edemez ve herkesi "kurum dışı" ilan ederdi.
 */
async function loadMemberNames(
  userIds: string[]
): Promise<Map<string, string> | null> {
  const unique = userIds.filter(
    (value, index) => userIds.indexOf(value) === index
  );

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", unique);

  if (error) {
    return null;
  }

  return new Map((data ?? []).map(row => [row.id, row.display_name]));
}

export type AuditPage<T> = {
  rows: T[];
  /** Sonraki sayfanın imleci. `null` ise liste GERÇEKTEN bitti. */
  nextCursor: number | null;
};

export const DEFAULT_AUDIT_LIMIT = 50;

/**
 * Kurumun denetim kaydından bir sayfa okur (v1.3-06).
 *
 * **İmleç `id` üzerindedir, `created_at` değil.** `created_at` varsayılanı
 * `now()` ve `now()` işlem başlangıç zamanıdır; aynı işlemde yazılan olaylar
 * birebir aynı damgayı taşır ve zaman damgası imleci onları sessizce atlardı
 * (`DECISION_LOG` — "Denetim kaydının imleci saat değil sıra numarasıdır").
 *
 * ⚠️ **`organization_id` süzmesi RLS'e ek olarak AÇIKÇA yazılıyor** ve bu bir
 * güvenlik önlemi değil, bir **indeks** meselesi. Kapsam zaten RLS'ten geliyor;
 * ama RLS koşulu `current_user_has_membership(...)` bir **fonksiyon çağrısıdır**,
 * sabit üzerinde bir eşitlik değil. Planlayıcı onu indeks koşuluna çeviremiyor.
 *
 * Canlıda ölçüldü (2026-09-09, `enable_seqscan = off` ile zorlanarak):
 *
 *     süzme YOKken → Index Scan Backward using audit_events_pkey
 *                    Filter: current_user_has_membership(...)
 *     süzme VARken → Index Scan using audit_events_org_id_desc_idx
 *                    Index Cond: (organization_id = ... AND id < ...)
 *
 * Yani açık süzme olmadan `(organization_id, id desc)` indeksi hiç
 * kullanılmıyor; sorgu birincil anahtarı geriye tarayıp RLS fonksiyonunu
 * **her satırda** çalıştırıyor. Tablo kurumlar arası büyüdükçe küçük bir
 * kurumun 51 satırını bulmak sınırsız sayıda satır taramak demek.
 */
export async function loadOrganizationAuditEvents(
  organizationId: string,
  limit = DEFAULT_AUDIT_LIMIT,
  cursor?: number | null
): Promise<AuditPage<OrganizationAuditEvent>> {
  let query = supabase
    .from("audit_events")
    .select("id, actor_user_id, action, entity_type, entity_id, created_at")
    .eq("organization_id", organizationId)
    .order("id", { ascending: false });

  if (cursor !== undefined && cursor !== null) {
    query = query.lt("id", cursor);
  }

  const { data, error } = await query.limit(limit + 1);

  if (error) {
    throw new Error("Denetim kaydı yüklenemedi.");
  }

  const rawRows = (data ?? []) as AuditRow[];
  const hasMore = rawRows.length > limit;
  const slicedRows = hasMore ? rawRows.slice(0, limit) : rawRows;
  const nextCursor =
    hasMore && slicedRows.length > 0
      ? slicedRows[slicedRows.length - 1].id
      : null;

  const actorIds = slicedRows
    .map(row => row.actor_user_id)
    .filter((value): value is string => Boolean(value));

  const names = await loadMemberNames(actorIds);

  const rows = slicedRows.map(row => ({
    id: row.id,
    actor: resolveAuditActor(row.actor_user_id, names),
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }));

  return {
    rows,
    nextCursor,
  };
}
