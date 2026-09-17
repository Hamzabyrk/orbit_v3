-- Kurum geneli toplamalar da girdi başına yetkilenir (v1.5-18 · 3/3, #314).
--
-- =========================================================================
-- Teşhis DÜZELTİLDİ — "limit'in yeri" tek başına sebep değildi
-- =========================================================================
--
-- §4.17 `report_exam_averages`'ı 1,9 s / 4 satır olarak ölçtü ve sebebini
-- şöyle yazdı: _"`limit 4` toplamadan SONRA uygulanıyor"_. Doğru bir gözlem
-- ama **eksik bir teşhis**, ve iki aday ölçülerek bu anlaşıldı:
--
--   Aday A · `limit`'i toplamadan önce al, RLS'e dokunma
--            (son 4 sınavı `exams`'tan seç, sonra yalnız onları topla)
--
--              yönetici   3.601 → 181 ms   ✅ 20×
--              öğretmen   1.422 → 2.246 ms 🔴 DAHA KÖTÜ
--
--            Sebebi: öğretmen için sınavların çoğunda görünür sonuç yok, o
--            yüzden `exists` süzgeci dört eşleşme bulmak için çok sınav
--            deniyor ve her denemede o sınavın bütün sonuçlarında politika
--            koşuyor. Yani `limit` öne alınsa bile satır başına yetki hesabı
--            aynı yerde duruyor. **Bir rolde kazanıp diğerinde kaybeden bir
--            düzeltme, düzeltme değildir** (aynı tuzağa `v1.5-18` 1/3'te de
--            düşülmüştü, orada `as materialized` çözmüştü).
--
--   Aday B · `payment_overview_counts`'un okuduğu satır kümesini daralt
--            (yalnız ödenmemiş + bu ay ödenmiş taksitler)
--
--              yönetici     703 → 782 ms   🔴 KAZANÇ YOK
--
--            Sebebi: daraltma koşulunun kendisi satır başına
--            `orbit_local_date(paid_at)` hesaplıyor ve RLS zaten bütün
--            satırlarda koşuyor. Eklenen `exists` de üstüne biniyor.
--
-- ✅ **İşleyen, yine 1/3 ve 2/3'ün kalıbı:** yetkiyi satır başına değil
-- **girdi başına bir kez** çözmek. Ölçülen (aynı tohum, beş kimlik, aynı
-- oturum — eski ve yeni gövde yan yana koşuldu):
--
--     report_exam_averages        eski        yeni
--       yönetici                3.728 ms      4 ms     932×
--       öğretmen                2.535 ms    174 ms      15×
--       öğrenci                 2.762 ms    201 ms      14×
--       veli                    2.813 ms    180 ms      16×
--       komşu kurum yöneticisi  1.403 ms      3 ms     468×
--
--     payment_overview_counts     eski        yeni
--       yönetici                  617 ms    100 ms       6×
--       komşu kurum yöneticisi    482 ms     92 ms       5×
--       öğretmen / öğrenci / veli  50-70 ms  27-37 ms   ~2×
--
-- **Beş kimliğin beşinde, iki fonksiyonun ikisinde de çıktı birebir aynı.**
-- Eşdeğerlik ölçüldü, iddia edilmedi: iki gövde aynı oturumda kurulup aynı
-- kimliklerle çağrıldı ve sonuçları dizge olarak karşılaştırıldı.
--
-- ⛔ `report_attendance_weeks` ve `report_homework_weeks` bu dosyada YOK:
-- ölçüldü, 5-14 ms. İkisi de tarih aralığıyla sınırlı, yani okudukları satır
-- sayısı zaten dört haftaya bağlı. Hızlı olanı desene taşımak bedava değil —
-- `definer` her seferinde kiracı duvarını elle yazmak demek.
--
-- =========================================================================
-- Yetki: ikisinde de KESİŞİM, ve ödeme tarafında eski bir karar korunuyor
-- =========================================================================
--
-- `report_exam_averages` — iki tablo, iki kapsam:
--
--     exams        : has_membership(org)                    (KURUM, her rol)
--     exam_results : admin | teaches_student
--                          | owns_student_record | guards_student   (ÖĞRENCİ)
--
-- Kesişim: kurumda aktif üyelik VE öğrenciyi görme hakkı. Bu yüzden ortalama
-- **çağırana göre değişir** ve bu bugünkü davranıştır: öğretmen kendi
-- öğrencilerinin ortalamasını görüyor, yönetici hepsinin. Yeni gövde de
-- öyle — eşdeğerlik testi tam bunu doğruluyor (beş rol, farklı çıktılar,
-- hepsi eskisiyle aynı).
--
-- 🔴 `payment_overview_counts` — burada dikkat: `student_payment_summaries`
-- **bilinçli olarak `definer` DEĞİL** (migration 20260908050000) ve gerekçesi
-- şuydu: ödeme yalnız yöneticiye ve veliye açık, `definer` yapılsaydı
-- öğretmen ailenin borcunu öğrenirdi.
--
-- Bu dosya o kararı **bozmuyor**, çünkü kapsam elle **birebir** yazılıyor:
--
--     current_user_can_see_payment_plan(plan_id)
--       = admin(plan'ın kurumu)  OR  guards_student(plan'ın öğrencisi)
--
--     aşağıdaki `gorunur_plan`
--       = admin(plan'ın kurumu)  OR  guards_student(plan'ın öğrencisi)
--
-- Öğretmen ve öğrenci için küme **boş** kalıyor, `having count(*) > 0`
-- devreye giriyor ve fonksiyon bugün olduğu gibi **hiç satır** döndürmüyor.
-- Ölçümde doğrulandı: öğretmen ve öğrenci için eski ve yeni çıktı aynı.
--
-- Yani ölçüt hâlâ hız değil: **yetki kararı satırın içeriğine mi bağlı,
-- girdinin kimliğine mi?** Buradaki karar plan kimliğine bağlı, o yüzden
-- girdi başına çözülebiliyor.
--
-- ⚠️ **`son_dort` içindeki `uye_kurum` join'i mantıksal olarak GEREKSİZDİR** ve
-- bu mutasyonla ortaya çıktı: kaldırıldığında on üç iddianın hiçbiri kırılmadı.
-- Sebebi sağlam: bir sınavın listeye girmesi için `gorunur_ogrenci` kümesinden
-- bir sonucu olması gerekiyor, o küme de üye olunan kurumlarla sınırlı, ve
-- `exam_results (exam_id, organization_id) → exams` bileşik yabancı anahtarı
-- kurumlar arası sonucu şemada imkânsız kılıyor. Join yine de duruyor çünkü
-- planlayıcıya `exists` koşmadan önce sınavları kuruma indirmesini söylüyor —
-- yani #312'deki dizi konjonksiyonuyla aynı aile: gereksiz ama indekslenebilir.
-- Kaldırılması bir hata olmazdı, ama yavaşlatırdı ve **bunu hiçbir test
-- söylemezdi.**
--
-- ⚠️ `as materialized` burada da şart ve sebebi `v1.5-18` 1/3'te ölçüldü:
-- yazılmadığında planlayıcı yetki süzgecini kümeleme/`distinct` sınırının
-- altına itiyor ve "bir kez" sessizce satır başına dönüyor (ROADMAP §4.17).

-- ---------------------------------------------------------------------------
-- Çağıranın aktif üyeliği olan kurumlar
-- ---------------------------------------------------------------------------
create or replace function public.current_user_member_org_ids()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(uyelik.organization_id), '{}'::uuid[])
  from public.organization_memberships as uyelik
  where uyelik.user_id = (select auth.uid())
    and uyelik.status = 'active';
$$;

comment on function public.current_user_member_org_ids() is
  'Çağıranın AKTİF üyeliği olan kurumların kimlikleri, rol ayrımı yapmadan. `exams_select_member` politikasının kurum düzeyindeki karşılığı. Argüman almadığı için sorgu başına bir kez hesaplanıyor.';

revoke all on function public.current_user_member_org_ids() from public, anon;
grant execute on function public.current_user_member_org_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Son dört sınavın ortalaması
-- ---------------------------------------------------------------------------
create or replace function public.report_exam_averages()
returns table (
  exam_id uuid,
  exam_name text,
  exam_date date,
  average_percent numeric,
  result_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with uye_kurum as materialized (
    select unnest(public.current_user_member_org_ids()) as org
  ),
  admin_kurum as materialized (
    select unnest(public.current_user_admin_org_ids()) as org
  ),
  gorunur_ogrenci as materialized (
    -- Yetki ÖĞRENCİ başına bir kez. Yönetici için ilk koşul yeterli ve
    -- fonksiyon çağırmıyor: kurum kimliği dizide mi, o kadar.
    select ogrenci.id
    from public.students as ogrenci
    join uye_kurum on uye_kurum.org = ogrenci.organization_id
    where ogrenci.organization_id in (select org from admin_kurum)
       or public.current_user_teaches_student(ogrenci.id)
       or ogrenci.auth_user_id = (select auth.uid())
       or public.current_user_guards_student(ogrenci.id)
  ),
  son_dort as materialized (
    -- `limit` toplamadan ÖNCE. Ama tek başına yetmiyordu (başlıktaki Aday A):
    -- kazancı veren şey `exists`'in artık görünür öğrenci kümesine bakması,
    -- yani satır başına politika koşmaması.
    select sinav.id, sinav.name, sinav.exam_date, sinav.max_score
    from public.exams as sinav
    join uye_kurum on uye_kurum.org = sinav.organization_id
    where sinav.archived_at is null
      and sinav.max_score > 0
      and exists (
        select 1
        from public.exam_results as sonuc
        join gorunur_ogrenci on gorunur_ogrenci.id = sonuc.student_id
        where sonuc.exam_id = sinav.id
      )
    order by sinav.exam_date desc, sinav.id desc
    limit 4
  )
  select
    son_dort.id as exam_id,
    son_dort.name as exam_name,
    son_dort.exam_date,
    round(avg(sonuc.score / son_dort.max_score) * 100, 1) as average_percent,
    count(*) as result_count
  from son_dort
  join public.exam_results as sonuc on sonuc.exam_id = son_dort.id
  join gorunur_ogrenci on gorunur_ogrenci.id = sonuc.student_id
  group by son_dort.id, son_dort.name, son_dort.exam_date
  order by son_dort.exam_date asc, son_dort.id asc;
$$;

comment on function public.report_exam_averages() is
  'Çağıranın görebildiği sonuçlara göre son dört sınavın yüzde ortalaması. Ortalama ÇAĞIRANA GÖRE DEĞİŞİR ve bu bugünkü davranıştır: öğretmen kendi öğrencilerinin, yönetici hepsinin ortalamasını görüyor. Yetki öğrenci başına BİR KEZ çözülür ve exams ile exam_results politikalarının KESİŞİMİDİR.';

revoke all on function public.report_exam_averages() from public, anon;
grant execute on function public.report_exam_averages() to authenticated;

-- ---------------------------------------------------------------------------
-- Ödeme panosu sayaçları
-- ---------------------------------------------------------------------------
create or replace function public.payment_overview_counts()
returns table (
  collected_this_month numeric,
  upcoming_count bigint,
  overdue_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with admin_kurum as materialized (
    select unnest(public.current_user_admin_org_ids()) as org
  ),
  gorunur_plan as materialized (
    -- `current_user_can_see_payment_plan`'ın birebir karşılığı: admin VEYA
    -- öğrencinin velisi. Öğretmen ve öğrenci için küme BOŞ kalır.
    select plan.id
    from public.payment_plans as plan
    where plan.archived_at is null
      and (
        plan.organization_id in (select org from admin_kurum)
        or public.current_user_guards_student(plan.student_id)
      )
  )
  select
    coalesce(
      sum(taksit.amount) filter (
        where taksit.paid_at is not null
          and public.orbit_local_date(taksit.paid_at)
                >= date_trunc('month', public.orbit_today())::date
          and public.orbit_local_date(taksit.paid_at) <= public.orbit_today()
      ),
      0
    ) as collected_this_month,
    count(*) filter (
      where taksit.paid_at is null
        and taksit.due_date >= public.orbit_today()
        and taksit.due_date <= public.orbit_today() + 7
    ) as upcoming_count,
    count(*) filter (
      where taksit.paid_at is null
        and taksit.due_date < public.orbit_today()
    ) as overdue_count
  from public.installments as taksit
  join gorunur_plan on gorunur_plan.id = taksit.plan_id
  -- ⚠️ `taksit.archived_at is null` — 20260912010000'in eklediği süzgeç
  -- ("yanlış girilmiş taksit geri alınabilir"). İlk yazımda GÖZDEN KAÇTI:
  -- gövdeyi 20260908050000'den kopyalamıştım, oysa fonksiyon sonradan
  -- yeniden tanımlanmıştı. `installment_archive_and_audit.test.sql` yakaladı
  -- (`have: 2, want: 1`). Ders: gövde migration metninden değil **canlı
  -- şemadan** alınır — diğer üç fonksiyon öyle alındığı için doğruydu.
  where taksit.archived_at is null
  -- Taksiti olmayan çağırana "0 tahsil edildi" DEMEZ: satır hiç dönmez (K-22).
  having count(*) > 0;
$$;

comment on function public.payment_overview_counts() is
  'Ödeme panosunun üç sayacı. Yetki plan başına BİR KEZ çözülür ve `current_user_can_see_payment_plan`ın birebir karşılığıdır: admin VEYA velisi. Öğretmen ve öğrenci boş küme alır, `having` devreye girer ve hiç satır dönmez — yani 20260908050000 kararı (ödeme kurum ile aile arasındadır) korunuyor.';

revoke all on function public.payment_overview_counts() from public, anon;
grant execute on function public.payment_overview_counts() to authenticated;
