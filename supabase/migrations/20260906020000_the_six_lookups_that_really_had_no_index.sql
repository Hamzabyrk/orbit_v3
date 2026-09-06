-- v1.2-18 · Gerçekten indekssiz olan altı arama
--
-- Kapsam turunun 11 numaralı bulgusu: `PLATFORM_SETTINGS` §5 "altı indekssiz
-- foreign key" diyordu, tetikleyicisi "v1.2 iş tabloları geldiğinde" idi.
-- Tablolar geldi, kimse §5'e dönmedi ve advisor sayısı **35**'e çıktı.
--
-- =========================================================================
-- Ama 35 eklenmedi — ve sebebi ölçüldü
-- =========================================================================
--
-- Supabase advisor'ı `unindexed_foreign_keys` için şunu arıyor: FK'nin sütun
-- listesiyle **birebir başlayan** bir indeks. v1.2'de tenant sınırını veri
-- düzeyinde tutmak için her çocuk tabloya bileşik FK'ler koyduk —
-- `(session_id, organization_id)`, `(class_id, organization_id)` gibi — ve
-- advisor bunların hepsini "kapsayan indeksi yok" diye işaretliyor.
--
-- Oysa şemada o FK'lerin **öncü sütununda zaten indeks var**:
--
--   * `attendance_records_session_idx (session_id)`
--   * `class_enrollments_class_idx (class_id, archived_at)`
--   * `exam_results_exam_score_idx (exam_id, score desc)`
--   * ... ve diğerleri
--
-- FK denetiminin yaptığı iş, ebeveyn satırı silinirken/güncellenirken çocukta
-- referans aramaktır ve öncü sütun indeksi bu aramayı fazlasıyla karşılar:
-- indeks `session_id`'yi daraltır, `organization_id` filtre olarak kalır. Bir
-- oturumun otuz kaydı, bir sınıfın otuz öğrencisi vardır — tarama değil.
--
-- 35 indeks eklemek, **29'u gereksiz** olan bir küme yaratırdı: her biri her
-- yazmada bakım maliyeti taşır ve advisor'da bu kez `unused_index` olarak
-- geri dönerdi. Uyarıyı susturmak için yazılan indeks, uyarının işaret ettiği
-- sorunu çözmez.
--
-- **Ölçülen şey mekanizma değil sonuç (K-13):** soru "advisor'ın sezgisi
-- eşleşiyor mu" değil, "bu arama indekssiz mi". Cevabı altı yerde evet.
--
-- =========================================================================
-- Altısının ortak özelliği
-- =========================================================================
--
-- Hiçbiri v1.2 iş tablosu değil — hepsi v1.1 ve platform ekseninden kalma.
-- İkisi `auth.users`'a bakan aktör sütunu, ikisi `branch_id` önce gelen
-- bileşik FK (mevcut indeksler `organization_id`'yi öne alıyor, dolayısıyla
-- önek eşleşmiyor), biri platform denetim kaydının kurumu, biri operatörü
-- kimin eklediği.
--
-- `branch_id` özellikle önemli: düşük kardinaliteli bir sütun. Orada öncü
-- sütun indeksi olsaydı bile çok satır dönerdi — ama yok, ve kurum silinirken
-- şube başına tarama yapılır.

-- Kurum silme akışı bu iki tabloyu da tarıyor: `internal_delete_organization`
-- üyelikleri ve denetim kayıtlarını siliyor.
create index organization_memberships_branch_idx
  on public.organization_memberships (branch_id, organization_id);

create index audit_events_branch_idx
  on public.audit_events (branch_id, organization_id);

-- Bir auth kullanıcısı silindiğinde (`on delete set null`) bu iki sütun
-- taranıyor. Kullanıcı silme bugün yalnızca `delete-organization` içinde var
-- ve orada kurumun bütün üyeleri tek tek siliniyor.
create index audit_events_actor_idx
  on public.audit_events (actor_user_id);

create index platform_audit_events_actor_idx
  on public.platform_audit_events (actor_user_id);

-- Kurum silinirken platform denetim kaydının kurum bağı çözülüyor.
create index platform_audit_events_organization_idx
  on public.platform_audit_events (organization_id);

-- Operatörü kimin eklediği. Operatör silme akışı bugün yok ama sütun
-- `auth.users`'a bakıyor ve kullanıcı silindiğinde taranıyor.
create index platform_operators_created_by_idx
  on public.platform_operators (created_by);
