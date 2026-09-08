-- `class_staff_names` vekil öğretmeni de kapsar (#228'in devamı).
--
-- =========================================================================
-- Neden gerekti
-- =========================================================================
--
-- 20260908000000 numaralı migration `class_staff_names`'i mentor ve
-- `class_teachers`'a atanmış öğretmenler üzerine kurdu. Bu, sınıf kartı için
-- yeterliydi — ama ders programı için değil.
--
-- `schedule_entries.membership_id` yorumu bunu zaten yazıyor:
--
--     'Dersi veren üyelik. class_teachers ile tutarlılık zorlanmaz: vekil
--      öğretmen atama olmadan bir saati doldurabilir.'
--
-- Yani bir program satırının öğretmeni, atama tablosunda OLMAYABİLİR. Önceki
-- haliyle fonksiyon o kişinin adını döndürmezdi ve ekran, dersi gerçekten
-- veren öğretmeni **adsız** gösterirdi.
--
-- Karar (`DECISION_LOG` — "Veli adı ve ders veren öğretmenin adı kurum içinde
-- görülebilir bilgidir") "gördüğün dersin öğretmeni" diyor. Vekil de o dersin
-- öğretmenidir; kapsam dışı kalması kararın harfine değil ama anlamına
-- aykırıydı.
--
-- **K-22 açısından:** adı çözülemeyen bir öğretmen için ekran hiçbir şey
-- çizmez. Yani boşluk sessizdir — kimse fark etmez, öğretmen adsız kalır ve
-- bunu yalnızca o dersi veren kişi bilir.
--
-- =========================================================================
-- Kapsam genişlemiyor, aynı ölçüt üçüncü bir kaynağa uygulanıyor
-- =========================================================================
--
-- Görünürlük ölçütü değişmedi: hâlâ **sınıfın kendisi**. Göremediğin bir
-- sınıfın programındaki vekilin adını da göremezsin. Eklenen tek şey, aynı
-- `visible` kümesinden `schedule_entries` üzerinden gelen üçüncü bir üyelik
-- kaynağı.

create or replace function public.class_staff_names(target_class_ids uuid[])
returns table (class_id uuid, membership_id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  with visible as (
    select
      class_row.id,
      class_row.organization_id,
      class_row.mentor_membership_id
    from public.classes as class_row
    where class_row.id = any(target_class_ids)
      and class_row.archived_at is null
      and (
        public.current_user_has_membership(
          class_row.organization_id, null, array['admin']::public.app_role[]
        )
        or public.current_user_teaches_class(class_row.id)
        or public.current_user_attends_class(class_row.id)
        or public.current_user_guards_class(class_row.id)
      )
  ),
  staff as (
    -- 1. Sınıfın mentoru
    select visible.id as class_id, visible.mentor_membership_id as membership_id
    from visible
    where visible.mentor_membership_id is not null
    union
    -- 2. Sınıfa atanmış öğretmenler
    select assignment.class_id, assignment.membership_id
    from public.class_teachers as assignment
    join visible on visible.id = assignment.class_id
    where assignment.archived_at is null
    union
    -- 3. Programda dersi veren üyelik — ATAMASI OLMAYABİLİR (vekil).
    select entry.class_id, entry.membership_id
    from public.schedule_entries as entry
    join visible on visible.id = entry.class_id
    where entry.membership_id is not null
      and entry.archived_at is null
  )
  select
    staff.class_id,
    staff.membership_id,
    profile.display_name
  from staff
  join public.organization_memberships as membership
    on membership.id = staff.membership_id
  join public.profiles as profile
    on profile.id = membership.user_id
  where not (select public.current_user_must_change_password());
$$;

comment on function public.class_staff_names(uuid[]) is
  'Çağıranın GÖREBİLDİĞİ sınıfların öğretmen adları: mentor, atanmış öğretmenler ve programda dersi veren üyelikler (vekil dahil). Yalnız `display_name` döner; `profiles` tablosu açılmaz, çünkü aynı satır `recovery_email`, `phone` ve şifre kilidi durumunu da taşır ve RLS sütun gizleyemez (#228). Görünürlük ölçütü sınıfın kendisidir: göremediğin bir sınıfın öğretmenini de göremezsin.';
