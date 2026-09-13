-- v1.4-11 · Ders bir kayıttır: iz bırakır ve öğretilirken kaybolamaz
--
-- Bu dilim ders programını ve öğretmen atamasını ekrana bağlıyor. K-10 turu
-- (2026-09-13) yazma yüzeyini ölçtü ve **beklediğimden iyi** buldu: üç tablonun
-- da politikaları ve sütun yetkileri tam.
--
--   `subjects` ........... INSERT (name, organization_id) · UPDATE (archived_at, name)
--   `class_teachers` ..... INSERT (class_id, membership_id, organization_id, subject_id)
--                          UPDATE (archived_at) — **yalnız arşiv**
--   `schedule_entries` ... INSERT ve UPDATE, dokuz/sekiz sütun
--
-- ⚠️ Bir ölçüm hatasından dönüldü ve kayda geçiyor: `information_schema
-- .role_table_grants` üçünde de yalnız SELECT gösteriyor ve ilk bakışta
-- "politikalar var ama GRANT yok, yani politikalar ölü" sonucuna varmıştım.
-- Yanlıştı — bu depo yetkiyi **sütun bazında** veriyor ve o görünüm onları
-- göstermiyor. Doğrusu `role_column_grants`'ta. v1.4-09'daki `is_default`
-- hatasının aynı ailesi: bir şeyin yok olduğunu söylemeden önce **doğru yere**
-- bakmak gerekir.
--
-- Dolayısıyla bu migration yazma yüzeyi açmıyor. İki şey yapıyor.
--
-- =========================================================================
-- 1. `subjects` iz bırakmıyordu
-- =========================================================================
--
-- Ölçüldü (üretim, 2026-09-13):
--
--   `subjects` yazma yetkisi ......... INSERT, UPDATE (sütun bazında, tam)
--   denetim tetikleyicisi ............ 0
--   yayın tetikleyicisi .............. 0
--   üretimdeki satır ................. 0
--
-- v1.4 ara denetimi (2026-09-13) `class_teachers` ve `schedule_entries`'in
-- aynı boşluğunu kapatmıştı ve **`subjects`'i atladı** — denetimin kendisi de
-- kapsamını eksik çizmiş oldu. Bu satırlar o borcu kapatıyor.
--
-- Ders adı beş tablonun okuduğu bir etikettir (aşağıya bakın); adının ne zaman
-- ve kim tarafından değiştirildiği sorulabilecek bir sorudur.

create trigger subjects_audit_insert
  after insert on public.subjects
  for each row execute function public.audit_row_change('subject', 'name');

create trigger subjects_audit_update
  after update on public.subjects
  for each row execute function public.audit_row_change('subject', 'name');

create trigger subjects_broadcast_insert
  after insert on public.subjects
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger subjects_broadcast_update
  after update on public.subjects
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger subjects_broadcast_delete
  after delete on public.subjects
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

-- =========================================================================
-- 2. Öğretilen bir ders arşivlenemez — ama geçmişi onu kilitlemez
-- =========================================================================
--
-- v1.4-09 ile aynı boşluk: `subjects`'e bakan **beş** yabancı anahtarın hepsi
-- `RESTRICT` ve yalnız DELETE'i engelliyor; **arşivlemeyi hiçbir şey
-- sınamıyor.** Ölçüldü:
--
--   class_teachers.subject_id ......... canlı atama
--   schedule_entries.subject_id ....... canlı program satırı
--   attendance_sessions.subject_id .... geçmiş kayıt
--   exams.subject_id .................. geçmiş kayıt
--   homework_assignments.subject_id ... geçmiş kayıt
--
-- 🔴 **Beşi de sayılsaydı kural işe yaramazdı.** Bir kez yoklama alınmış ders
-- bir daha asla arşivlenemezdi; "artık bu dersi vermiyoruz" demenin yolu
-- kalmazdı. Geçmiş kayıt zaten arşivlenmeyi engellememeli: arşiv **silme
-- değil**, satır duruyor ve adı çözülmeye devam ediyor. Eski bir sınavın
-- "Astronomi" yazması doğrudur ve doğru kalmalıdır.
--
-- Engellenen şey **canlı** olan: bugün birine erişim veren öğretmen ataması ve
-- bu hafta okutulan program satırı. Arşivlenmiş bir derse bağlı **canlı** bir
-- atama, listelerden düşmeyen ama "yok" sayılan bir yapı olurdu — v1.4-09'un
-- dolu şubesiyle aynı cümle.
--
-- Kod `ORB03` ("satır bu iş için uygun değil"); yeni kod açılmadı çünkü
-- kullanıcının cevabı aynı biçimde: "önce şunu kaldır, sonra tekrar dene".

create or replace function public.enforce_subject_is_unused_before_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  atama bigint;
  program bigint;
begin
  -- Yalnız arşive GEÇİŞ sınanır. Zaten arşivli bir satırın adının
  -- düzeltilmesi ya da arşivden çıkarılması bu kuralın konusu değil.
  if new.archived_at is null or old.archived_at is not null then
    return new;
  end if;

  select count(*) into atama
  from public.class_teachers as ogretmen_atamasi
  where ogretmen_atamasi.subject_id = new.id
    and ogretmen_atamasi.archived_at is null;

  select count(*) into program
  from public.schedule_entries as program_satiri
  where program_satiri.subject_id = new.id
    and program_satiri.archived_at is null;

  if atama > 0 or program > 0 then
    raise exception 'Bu ders kapatılamaz: hâlâ okutuluyor.'
      using errcode = 'ORB03',
            detail = format('atama=%s, program=%s', atama, program),
            hint = 'Önce bu dersin öğretmen atamalarını ve program satırlarını kaldırın.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_subject_is_unused_before_archive() is
  'Canlı bir öğretmen ataması veya program satırı taşıyan ders arşivlenemez (ORB03). Geçmiş kayıtlar (yoklama, sınav, ödev) BİLEREK sayılmaz: arşiv silme değildir, o satırlar dersin adını okumaya devam eder ve bir kez kullanılmış dersin sonsuza dek kilitlenmesi kuralı işlevsiz kılardı.';

revoke all on function public.enforce_subject_is_unused_before_archive()
  from public, anon, authenticated;

create trigger subjects_unused_before_archive
  before update of archived_at on public.subjects
  for each row execute function public.enforce_subject_is_unused_before_archive();
