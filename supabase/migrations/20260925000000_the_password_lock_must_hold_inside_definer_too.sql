-- Şifre kilidi `security definer` fonksiyonların İÇİNDE de tutar (#314).
--
-- =========================================================================
-- 🔴 Bu bir GERİLEMENİN düzeltmesi ve gerileme bu oturumda benim eklediğim
-- =========================================================================
--
-- `v1.5-17` (#308), `v1.5-18` 1/3 (#310) ve 3/3 (#314) beş okuma yolunu
-- `security definer` kalıbına taşıdı. Kalıbın gereği, yetki artık elle
-- yazılıyor — ve elle yazılırken **politikaların her SELECT'ine eklediği bir
-- şart atlandı**:
--
--     and not (select public.current_user_must_change_password())
--
-- Ölçüldü (2026-09-18), şifre kilidi açık bir kurum yöneticisiyle:
--
--     RLS ile DOĞRUDAN okuma          DEFINER RPC üzerinden
--       attendance_records   0          student_attendance_counts    1  🔴
--       exam_results         0          student_latest_exam_scores   1  🔴
--       installments         0          student_homework_ratios      1  🔴
--       audit_events         0          report_exam_averages         1  🔴
--                                       payment_overview_counts      1  🔴
--
-- Yani politikalar kilidi tutuyordu, benim yazdığım beş fonksiyon tutmuyordu.
--
-- **Neden önemli:** kilit E3'te bilinçli konmuştu — hesap kâğıda yazılmış
-- **geçici** bir şifreyle açılıyor ve kullanıcının ilk işi onu değiştirmek
-- olmak zorunda (`DECISION_LOG` — "hesaplar davet e-postasıyla değil,
-- doğrudan geçici şifreyle açılır"). Kilit atlanabiliyorsa, elindeki fişle
-- giriş yapan biri şifresini hiç değiştirmeden veri okuyabiliyor. Ekran onu
-- şifre değiştirme sayfasına zorluyor ama **API zorlamıyordu**.
--
-- =========================================================================
-- Kalıbın üçüncü tuzağı — ve kaydı
-- =========================================================================
--
-- `definer` RLS'i atladığı için yetkiyi elle yazmak gerekiyor. Şimdiye kadar
-- iki tuzağı kayda geçirdik (ROADMAP §4.17, §4.18):
--
--   1. `as materialized` yazılmazsa "girdi başına bir kez" satır başına döner.
--   2. İki tablonun politikaları farklı kapsamdaysa KESİŞİM alınmalı.
--
-- Bu üçüncüsü: **politikadaki her şartı taşımak zorundasın, yalnız ilginç
-- olanı değil.** `must_change_password` politikalarda dört rolün dördünde de
-- tekrar ediyor, tam bu yüzden gözden kaçtı — "hep orada" olan şey okunmaz
-- hâle geliyor. Karşılığı yapısal bir kapı:
-- `password_lock_holds_in_rpcs.test.sql` beş fonksiyonu tek tek sınıyor.

-- ---------------------------------------------------------------------------
-- 1. Ödev oranı (v1.5-17, #308)
-- ---------------------------------------------------------------------------
create or replace function public.student_homework_ratios(target_student_ids uuid[])
returns table (
  student_id uuid,
  recorded_count bigint,
  submitted_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with gorunur_kayit as (
    select
      kayit.student_id,
      kayit.class_id,
      kayit.organization_id,
      public.orbit_local_date(kayit.created_at) as enrolled_on
    from public.class_enrollments as kayit
    where kayit.student_id = any(target_student_ids)
      and kayit.archived_at is null
      and not (select public.current_user_must_change_password())
      and (
        public.current_user_has_membership(
          kayit.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_class(kayit.class_id)
        or public.current_user_owns_student_record(kayit.student_id)
        or public.current_user_guards_student(kayit.student_id)
      )
  ),
  gorunur_odev as (
    select distinct
      kayit.student_id,
      kayit.enrolled_on,
      odev.id as homework_id,
      odev.assigned_on
    from gorunur_kayit as kayit
    join public.homework_assignments as odev
      on odev.class_id = kayit.class_id
     and odev.organization_id = kayit.organization_id
    where odev.archived_at is null
      and odev.submissions_recorded_at is not null
  ),
  teslim as (
    select
      odev.student_id,
      odev.homework_id
    from gorunur_odev as odev
    join public.homework_submissions as kayit_teslim
      on kayit_teslim.homework_id = odev.homework_id
     and kayit_teslim.student_id = odev.student_id
    where kayit_teslim.archived_at is null
  )
  select
    odev.student_id,
    count(*) as recorded_count,
    count(*) filter (where teslim.homework_id is not null) as submitted_count
  from gorunur_odev as odev
  left join teslim
    on teslim.student_id = odev.student_id
   and teslim.homework_id = odev.homework_id
  where teslim.homework_id is not null
     or odev.assigned_on >= odev.enrolled_on
  group by odev.student_id;
$$;

-- ---------------------------------------------------------------------------
-- 2. Yoklama sayıları (v1.5-18 · 1/3, #310)
-- ---------------------------------------------------------------------------
create or replace function public.student_attendance_counts(target_student_ids uuid[])
returns table (
  student_id uuid,
  present_count bigint,
  late_count bigint,
  absent_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with ham as materialized (
    select
      kayit.student_id,
      kayit.status,
      oturum.class_id,
      oturum.organization_id
    from public.attendance_records as kayit
    join public.attendance_sessions as oturum
      on oturum.id = kayit.session_id
     and oturum.organization_id = kayit.organization_id
    where kayit.student_id = any(target_student_ids)
      and oturum.archived_at is null
  ),
  cift as materialized (
    select distinct student_id, class_id, organization_id from ham
  ),
  gorunur as (
    select cift.student_id, cift.class_id
    from cift
    where
      not (select public.current_user_must_change_password())
      and (
        public.current_user_has_membership(
          cift.organization_id, null, array['admin']::public.app_role[]
        )
        or (
          public.current_user_teaches_student(cift.student_id)
          and public.current_user_teaches_class(cift.class_id)
        )
        or (
          public.current_user_owns_student_record(cift.student_id)
          and public.current_user_attends_class(cift.class_id)
        )
        or (
          public.current_user_guards_student(cift.student_id)
          and public.current_user_guards_class(cift.class_id)
        )
      )
  )
  select
    ham.student_id,
    count(*) filter (where ham.status = 'present') as present_count,
    count(*) filter (where ham.status = 'late') as late_count,
    count(*) filter (where ham.status = 'absent') as absent_count
  from ham
  join gorunur
    on gorunur.student_id = ham.student_id
   and gorunur.class_id = ham.class_id
  group by ham.student_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. Son sınav puanı (v1.5-18 · 1/3, #310)
-- ---------------------------------------------------------------------------
create or replace function public.student_latest_exam_scores(target_student_ids uuid[])
returns table (
  student_id uuid,
  score numeric,
  exam_id uuid,
  exam_name text,
  exam_date date,
  max_score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  with ham as materialized (
    select
      sonuc.student_id,
      sonuc.score,
      sinav.id as exam_id,
      sinav.name as exam_name,
      sinav.exam_date,
      sinav.max_score,
      sinav.organization_id
    from public.exam_results as sonuc
    join public.exams as sinav
      on sinav.id = sonuc.exam_id
     and sinav.organization_id = sonuc.organization_id
    where sonuc.student_id = any(target_student_ids)
      and sinav.archived_at is null
  ),
  cift as materialized (
    select distinct student_id, organization_id from ham
  ),
  gorunur as (
    select cift.student_id
    from cift
    where
      not (select public.current_user_must_change_password())
      and public.current_user_has_membership(cift.organization_id)
      and (
        public.current_user_has_membership(
          cift.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_student(cift.student_id)
        or public.current_user_owns_student_record(cift.student_id)
        or public.current_user_guards_student(cift.student_id)
      )
  )
  select distinct on (ham.student_id)
    ham.student_id,
    ham.score,
    ham.exam_id,
    ham.exam_name,
    ham.exam_date,
    ham.max_score
  from ham
  join gorunur on gorunur.student_id = ham.student_id
  order by ham.student_id, ham.exam_date desc, ham.exam_id desc;
$$;

-- ---------------------------------------------------------------------------
-- 4. Son dört sınavın ortalaması (v1.5-18 · 3/3, #314)
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
    select ogrenci.id
    from public.students as ogrenci
    join uye_kurum on uye_kurum.org = ogrenci.organization_id
    where not (select public.current_user_must_change_password())
      and (
        ogrenci.organization_id in (select org from admin_kurum)
        or public.current_user_teaches_student(ogrenci.id)
        or ogrenci.auth_user_id = (select auth.uid())
        or public.current_user_guards_student(ogrenci.id)
      )
  ),
  son_dort as materialized (
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

-- ---------------------------------------------------------------------------
-- 5. Ödeme panosu sayaçları (v1.5-18 · 3/3, #314)
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
    select plan.id
    from public.payment_plans as plan
    where plan.archived_at is null
      and not (select public.current_user_must_change_password())
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
  where taksit.archived_at is null
  having count(*) > 0;
$$;
