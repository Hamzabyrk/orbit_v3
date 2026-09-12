-- v1.4 ara denetimi · Erişim veren atama iz bırakır; operatör sayıları tamamlanır
--
-- Bu migration bir dilime değil, **v1.4'ün ortasında koşulan bir denetim turuna**
-- ait (2026-09-13). Amacı yeni davranış getirmek değil; dilim dilim ilerlerken
-- tutarlı uygulanmamış üç kuralı hizalamak.
--
-- =========================================================================
-- 1. `class_teachers` — erişim veren ama iz bırakmayan yazma
-- =========================================================================
--
-- Ölçüldü (üretim, 2026-09-13):
--
--   `class_teachers` yazma yetkisi ....... INSERT, UPDATE (2 politika)
--   denetim tetikleyicisi ................ 0
--   yayın tetikleyicisi .................. 0
--
-- **Bu tablo bir erişim kapısıdır.** `current_user_teaches_class` tam olarak
-- ona bakıyor; bir öğretmeni sınıfa atamak o sınıfın **öğrencilerine,
-- yoklamasına, sınavlarına ve ödevlerine** erişim açar. Yani satır eklemek
-- yetki vermektir.
--
-- v1.4-10'da `student_guardians` **tam bu gerekçeyle** denetim almıştı:
--
--   > "Bir bağın kurulması ve koparılması velinin erişiminin açılması ve
--   >  kapanması demek. Kimin ne zaman erişim kazandığı, denetim defterinin
--   >  cevaplaması gereken ilk sorulardan biri."
--
-- `class_teachers` aynı cümlenin öğretmen hali ve atlanmıştı. Bugün istemciden
-- yazılmıyor (ölçüldü: sıfır çağrı), yani boşluk **uyuyor** — ama **v1.4-11**
-- (ders programı ve öğretmen ataması) onu canlandıracak. Borç o dilime
-- bırakılmadı çünkü o dilim geldiğinde sorulacak soru "neden iz yok" olurdu.

create trigger class_teachers_audit_insert
  after insert on public.class_teachers
  for each row execute function public.audit_row_change(
    'class_teacher', 'class_id', 'membership_id', 'subject_id'
  );

create trigger class_teachers_audit_update
  after update on public.class_teachers
  for each row execute function public.audit_row_change(
    'class_teacher', 'class_id', 'membership_id', 'subject_id'
  );

create trigger class_teachers_broadcast_insert
  after insert on public.class_teachers
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger class_teachers_broadcast_update
  after update on public.class_teachers
  referencing new table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

create trigger class_teachers_broadcast_delete
  after delete on public.class_teachers
  referencing old table as changed_rows
  for each statement
  execute function public.broadcast_organization_change();

-- =========================================================================
-- 2. `schedule_entries` — yayın vardı, iz yoktu
-- =========================================================================
--
-- Ölçüldü: üç yayın tetikleyicisi var, **sıfır** denetim tetikleyicisi.
-- Yayın v1.3-13'te toplu olarak eklendi; denetim v1.4-02'de geldi ve bu tablo
-- o turda atlandı.
--
-- Program satırı da bir yetki taşıyor: `enforce_schedule_membership_is_eligible`
-- onu sınıyor ve `enforce_role_change_keeps_assignments` program satırını
-- "ayakta duran atama" sayıyor — yani bir üyenin rolünün değiştirilmesini
-- engelleyen üç şeyden biri. Kimin ne zaman program satırı eklediği
-- sorulabilecek bir sorudur.

create trigger schedule_entries_audit_insert
  after insert on public.schedule_entries
  for each row execute function public.audit_row_change(
    'schedule_entry', 'class_id', 'membership_id', 'subject_id', 'day_of_week', 'starts_at', 'room'
  );

create trigger schedule_entries_audit_update
  after update on public.schedule_entries
  for each row execute function public.audit_row_change(
    'schedule_entry', 'class_id', 'membership_id', 'subject_id', 'day_of_week', 'starts_at', 'room'
  );

-- =========================================================================
-- 3. Karşılanmamış bir K-12 kontrol noktası
-- =========================================================================
--
-- `ROADMAP` §4.6 şunu yazmıştı ve kontrol noktası **v1.4-01 açılışıydı**:
--
--   > "Şart: öğrenci yazan ilk ekran geldiğinde. Kontrol noktası: v1.4-01
--   >  (öğrenci kaydı CRUD) açılışı. Yapılacak iş: fonksiyona `student_count`
--   >  ve `guardian_count` eklemek ve panelde göstermek."
--
-- v1.4-01 açıldı ve kapandı; **iş yapılmadı ve kimse fark etmedi.** Ölçüldü
-- (2026-09-13): `platform_organization_stats` çıktısında ne `student_count`
-- ne `guardian_count` var.
--
-- K-12 tam olarak bunu önlemek için yazılmıştı: koşullu bir karara **sahip ve
-- kontrol noktası** verilir. Kontrol noktası geldi, sahip bakmadı. Borç burada
-- kapanıyor ve kaçırılmış olması `ROADMAP`'e işleniyor.
--
-- ⚠️ **Yeni sayımlar arşivlenmemişleri sayıyor.** Operatörün sorusu "bu kurumda
-- kaç öğrenci var" — arşivlenmiş kayıt o sorunun cevabı değil.
--
-- ⚠️ **`branch_count` da arşiv süzer hale geldi ve bu bir davranış değişimi.**
-- Bugüne kadar şube arşivlenemiyordu (yazma yolu yoktu), dolayısıyla sayı
-- aynıydı; v1.4-09 arşivlemeyi açtığı an arşivli şubeyi saymak yanlış olurdu.
--
-- ⚠️ **Mevcut dört anahtar korunuyor.** `member_count`, `admin_count`,
-- `branch_count` ve `audit_event_count` platform panelinin okuduğu alanlar;
-- yeniden yazarken birini düşürmek paneli **sessizce** bozardı. Bu fonksiyon
-- `create or replace` ile değiştiği için eski gövde tamamen yerini veriyor —
-- eksiği derleyici yakalamaz, yalnız ekran yakalar.

create or replace function public.platform_organization_stats(
  target_organization_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not public.current_user_is_platform_operator() then null
    else jsonb_build_object(
      -- Mevcut dört anahtar OLDUĞU GİBİ korunuyor: platform paneli onları
      -- okuyor ve bir anahtarı düşürmek paneli sessizce bozardı.
      'member_count', (
        select count(*) from public.organization_memberships as uye
        where uye.organization_id = target_organization_id
      ),
      'admin_count', (
        select count(*) from public.organization_memberships as uye
        where uye.organization_id = target_organization_id and uye.role = 'admin'
      ),
      'branch_count', (
        select count(*) from public.branches as sube
        where sube.organization_id = target_organization_id
          and sube.archived_at is null
      ),
      'audit_event_count', (
        select count(*) from public.audit_events as olay
        where olay.organization_id = target_organization_id
      ),
      'student_count', (
        select count(*) from public.students as ogr
        where ogr.organization_id = target_organization_id
          and ogr.archived_at is null
      ),
      'guardian_count', (
        select count(*) from public.guardians as veli
        where veli.organization_id = target_organization_id
          and veli.archived_at is null
      )
    )
  end;
$$;

comment on function public.platform_organization_stats(uuid) is
  'Platform operatörünün kurum özeti: üyelik, şube, öğrenci ve veli sayısı. Öğrenci ve veli sayıları v1.4 ara denetiminde eklendi — §4.6''nın v1.4-01 açılışına çapalanmış K-12 kontrol noktası kaçırılmıştı. Arşivlenmiş kayıtlar sayılmaz. Operatör olmayan çağırana veri değil NULL döner.';

revoke all on function public.platform_organization_stats(uuid)
  from public, anon;
grant execute on function public.platform_organization_stats(uuid) to authenticated;
