-- Kiracı süzgeci döngüde değil indekste durur (v1.5-19, #317).
--
-- =========================================================================
-- Ölçüm — yüzey taraması, bir dershane-yılı tohumu, dört kimlik
-- =========================================================================
--
-- Her kiracılı tablo, PostgREST'in yaptığı gibi 1000 satır tavanıyla okundu:
--
--     öğrenci     · attendance_records    40.743 ms   (390 satır döndü)
--     komşu admin · attendance_records    19.381 ms   (0 satır)
--     öğrenci     · exam_results           4.439 ms
--     öğretmen    · installments           4.364 ms   (0 satır)
--     komşu admin · attendance_sessions    2.070 ms   (0 satır)
--     yönetici    · homework_submissions     989 ms
--     HER ROL     · students                ~650 ms
--     her rol     · student_guardians       ~620 ms
--     her rol     · daily_feed_posts        ~350 ms
--     her rol     · schedule_entries        ~210 ms
--     her rol     · class_enrollments       ~125 ms
--
-- 🔴 Son beş satır **reddedilen okuma değil.** Yöneticinin kendi kurumunun
-- öğrencilerini okuması da 650 ms sürüyor, çünkü politika **bütün
-- kiracıların** satırlarında koşuyor: 2.700 öğrencinin 2.300'ü elenene kadar
-- satır başına dört fonksiyon. Kurum sayısı arttıkça bu sayı doğrusal büyür.
--
-- =========================================================================
-- Çözüm: mevcut politikalara DOKUNMADAN, ayrı bir `restrictive` politika
-- =========================================================================
--
-- §4.18 `audit_events`'te kurum düzeyi bir ön süzgecin reddedilen okumayı
-- 3.125 → 0,28 ms yaptığını ölçtü ve şu kuralı yazdı:
--
--   > Satır düzeyindeki yetki predikatının YANINA, ondan mantıksal olarak ima
--   > edilen ve argüman almayan bir kurum düzeyi üst küme konursa, planlayıcı
--   > onu indeks koşuluna çevirebilir. Üst küme gereksiz olduğu için yetki
--   > değişmez; indekslenebilir olduğu için maliyet değişir.
--
-- Orada konjonksiyon politikanın içine yazılmıştı. Burada on tablo var ve
-- dördü ayrı politikaya bölünmüş; hepsini yeniden yazmak kırk politikayı
-- riske atardı. Onun yerine **`as restrictive`** kullanılıyor: PostgreSQL
-- kısıtlayıcı politikaları izin verenlerle `AND`'liyor, yani etki birebir aynı
-- ve **mevcut politikaların metnine hiç dokunulmuyor.** Bu dosya yalnız
-- ekliyor; hiçbir `drop policy` yok.
--
-- =========================================================================
-- Üst kümenin ÜÇ dalı var ve üçü de gerekli
-- =========================================================================
--
--     current_user_scope_org_ids()
--       = { kurum : aktif ÜYELİK }          -- admin, öğretmen, öğrenci, veli rolleri
--       ∪ { kurum : ÖĞRENCİ kaydı }         -- students.auth_user_id = uid
--       ∪ { kurum : VELİ kaydı }            -- guardians.auth_user_id = uid
--
-- ⚠️ **Yalnız üyelik alınsaydı yetki DARALIRDI.** `current_user_owns_student_record`
-- ve `current_user_guards_student` üyeliğe bakmıyor, yalnız `auth_user_id`'ye
-- bakıyor. Üyeliği askıya alınmış ama öğrenci kaydı bağlı duran biri bugün
-- kendi satırlarını görüyor; üyelik-yalnız bir üst küme onu kapatırdı. Testte
-- karşılığı var.
--
-- =========================================================================
-- İSPAT: üst küme her mevcut ayrıktan ima ediliyor
-- =========================================================================
--
-- Konjonksiyonun hiçbir satırı kapatmadığını göstermek için, on tablodaki her
-- ayrığın `organization_id ∈ scope` sonucunu verdiğini göstermek yeterli.
-- Dayanak, deponun ikinci kiracı sınırı olan **bileşik yabancı anahtarlar**:
-- `(student_id, organization_id) → students`, `(class_id, organization_id) →
-- classes`, `(plan_id, organization_id) → payment_plans` ve benzerleri satırın
-- kurumunu referans verdiği kaydın kurumuna **şema düzeyinde** bağlıyor.
--
--   has_membership(organization_id, …)   → o kurumda aktif üyelik      → ÜYELİK dalı
--   teaches_student(X) / teaches_class(C) → sınıfın kurumunda aktif üyelik
--                                          (teaches_class üyelik şartı taşıyor) → ÜYELİK
--   attends_class(C)                     → C'ye kayıtlı, auth_user_id'si benim
--                                          olan bir students satırı        → ÖĞRENCİ
--   owns_student_record(X)               → X benim students satırım       → ÖĞRENCİ
--   guards_student(X) / guards_class(C)  → auth_user_id'si benim olan bir
--                                          guardians satırı                → VELİ
--   students_select_self                 → satırın kendisi benim kaydım    → ÖĞRENCİ
--   student_guardians_select_guardian    → guardian_id benim veli kaydım   → VELİ
--   schedule_entries_select_teacher (2.) → membership_id benim aktif üyeliğim → ÜYELİK
--   homework_submissions_select_teacher  → ödevin sınıfını okutuyorum      → ÜYELİK
--   installments_select_authorized       → can_see_payment_plan = admin(plan'ın
--                                          kurumu) ∨ guards_student        → ÜYELİK ∨ VELİ
--
-- Hepsinde satırın `organization_id`'si, ayrığın dayandığı kaydın kurumuna
-- eşit. Yani konjonksiyon **mantıksal olarak gereksizdir**.
--
-- ⚠️ Ve aynı sebeple **davranışsal bir test onun kaldırılmasını göremez**
-- (#312'de aynısı yaşandı). Karşılığı yapısal bir kapı:
-- `tenant_prefilter_stays.test.sql` on politikanın da durduğunu sınıyor.
--
-- =========================================================================
-- Ölçülen sonuç — ve açıkça KAPATILMAYAN yer
-- =========================================================================
--
--     komşu admin · attendance_records   19.381 ms →   255 ms
--     yönetici    · students (filtresiz)    651 ms →    91 ms
--     yönetici    · students (ekran)        650 ms →   100 ms
--
-- Kazanç kurum sayısıyla ölçekleniyor: tohumda 2.700 öğrencinin 400'ü ölçülen
-- kuruma ait, ve süre 7× düştü (2700/400 ≈ 6,75).
--
-- =========================================================================
-- Şifre kilidi burada da var — ve bunu MEVCUT BİR KAPI hatırlattı
-- =========================================================================
--
-- On politikanın ilk hâli yalnız kurum süzgecini taşıyordu. `supabase test db`
-- düştü: `password_lock_boundary.test.sql` _"şifre kilidini atlayan tam altı
-- politika var ve altısı da kimlik okumasıdır"_ diye bir iddia tutuyor ve
-- benim on politikam o listeye girdi.
--
-- Teknik olarak zararsızdı — `restrictive` politika izin verenlerle `AND`'lenir
-- ve onlar kilidi zaten taşıyor, yani kilit hiç atlanmıyordu. Ama kilit
-- **eklendi**, iki sebeple:
--
--   1. Kapının muafiyet listesini genişletmek kapıyı zayıflatırdı. Altı istisna
--      sayılabilir; "artı bütün kısıtlayıcı politikalar" sayılamaz.
--   2. Savunma derinliği: ileride izin veren bir politika kilidi unutursa,
--      kısıtlayıcı politika onu yine de tutar. Maliyeti sorgu başına bir
--      InitPlan çağrısı — izin veren politikalar zaten hesaplıyor.
--
-- ⚠️ Kayda değer olan taraf: bu tam olarak **K-25**'in (2026-09-18) sınadığı
-- şeydi — _"politikadaki her şart taşınmalı, yalnız ilginç olanı değil"_ —
-- ve kural yazıldıktan bir gün sonra aynı hata tekrar edildi. Kuralı ben
-- hatırlamadım; **kapı hatırlattı.** Kuralın kapısı olmadan kural yetmiyor.
--
-- =========================================================================
-- 🔴 **Kapatılmayan: kendi kurumu içinde düşük seçicilikli filtresiz okuma.**
-- Öğrencinin bütün yoklama tablosunu istemesi 40.743 → 29.736 ms oldu, yani
-- hâlâ pahalı. Sebebi açık: öğrenci o kurumun İÇİNDE, dolayısıyla ön süzgeç
-- hiçbir satır elemiyor ve 93.600 satırda satır başına politika koşuyor.
-- Bu bir RLS sorunu değil; istemci böyle bir sorgu hiç üretmiyor (her okuma
-- süzgeçli). Karşılığı **hız sınırı** ve o `v1.5-04`'ün kapsamında.

create or replace function public.current_user_scope_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct kurum), '{}'::uuid[])
  from (
    select uyelik.organization_id as kurum
    from public.organization_memberships as uyelik
    where uyelik.user_id = (select auth.uid())
      and uyelik.status = 'active'
    union
    select ogrenci.organization_id
    from public.students as ogrenci
    where ogrenci.auth_user_id = (select auth.uid())
    union
    select veli.organization_id
    from public.guardians as veli
    where veli.auth_user_id = (select auth.uid())
  ) as kaynak;
$$;

comment on function public.current_user_scope_org_ids() is
  'Çağıranın herhangi bir kimlikle bağlı olduğu kurumlar: aktif üyelik VEYA öğrenci kaydı VEYA veli kaydı. Yetki kararı DEĞİL, bütün okuma politikalarının kurum düzeyindeki ÜST KÜMESİ — her ayrık bunu ima eder, o yüzden hiçbir satırı açmaz veya kapatmaz. Argüman almadığı için sorgu başına bir kez hesaplanıp indeks koşuluna çevrilebiliyor. Öğrenci ve veli dalları şart: o iki kapsam yardımcısı üyeliğe değil auth_user_id''ye bakıyor.';

revoke all on function public.current_user_scope_org_ids() from public, anon;
grant execute on function public.current_user_scope_org_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Kısıtlayıcı ön süzgeç — on tablo, hepsi aynı ifade
-- ---------------------------------------------------------------------------
-- `as restrictive` izin veren politikalarla `AND`'lenir. Mevcut politikaların
-- hiçbirine dokunulmuyor; bu dosyada tek bir `drop policy` yok.

create policy attendance_records_tenant_prefilter on public.attendance_records
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy attendance_sessions_tenant_prefilter on public.attendance_sessions
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy exam_results_tenant_prefilter on public.exam_results
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy installments_tenant_prefilter on public.installments
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy homework_submissions_tenant_prefilter on public.homework_submissions
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy students_tenant_prefilter on public.students
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy student_guardians_tenant_prefilter on public.student_guardians
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy daily_feed_posts_tenant_prefilter on public.daily_feed_posts
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy schedule_entries_tenant_prefilter on public.schedule_entries
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );

create policy class_enrollments_tenant_prefilter on public.class_enrollments
  as restrictive for select to authenticated
  using (
    organization_id = any((select public.current_user_scope_org_ids())::uuid[])
    and not (select public.current_user_must_change_password())
  );
