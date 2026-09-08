-- Veli adı ve ders veren öğretmenin adı kurum içinde görülebilir olur (#228).
--
-- Karar: `.ai/DECISION_LOG.md` — "Veli adı ve ders veren öğretmenin adı kurum
-- içinde görülebilir bilgidir" (2026-09-07, Arda Bülent).
--
-- =========================================================================
-- Ne ölçüldü
-- =========================================================================
--
-- v1.3-01/A incelemesinde canlıya geçici bir öğrenci, sınıf, veli ve bağ
-- yazıldı, dört rolün kimliğiyle sorgulandı, sonra silindi:
--
--   rol       | öğrenci | veli | bağ | sınıf | profil
--   ----------|---------|------|-----|-------|-------
--   admin     |    1    |   1  |  1  |   1   |   4
--   teacher   |    1    |   0  |  0  |   1   |   1 (yalnız kendi)
--   student   |    1    |   0  |  0  |   1   |   1 (yalnız kendi)
--   parent    |    1    |   1  |  1  |   1   |   1 (yalnız kendi)
--
-- Yani öğretmen, öğrettiği çocuğun velisinin adını göremiyordu; öğrenci de
-- kendi sınıfının öğretmeninin adını.
--
-- =========================================================================
-- Bu bir boşluk değil, bilerek geri alınan bir sınır
-- =========================================================================
--
-- Veli tarafı bir boşluk DEĞİLDİ. `student_guardians.test.sql:275` şunu
-- iddia ediyordu ve gerekçesini de yazıyordu:
--
--     'a teacher sees no guardian links — that is not their business'
--
-- Karar kaydı seviyesinde değildi, ama açık bir niyet beyanıydı ve teste
-- sabitlenmişti. Bu migration onu **bilerek** geri alıyor; karar sahibine
-- önceki sınır gösterildikten sonra sürdürüldü (2026-09-08).
--
-- Gerekçe: "bu onun işi değil" cümlesi bir dershanenin işleyişini yanlış
-- tarif ediyor. Öğretmenin veliyle konuşması istisna değil, işin kendisi.
-- Adını bilmediği bir veliyle iletişim kuramaz.
--
-- Öğretmen tarafında (mentor adı) ise gerçekten kayıt yoktu.
--
-- Eski test iddiası SİLİNMİYOR, tersine çevrilip sebebi yanına yazılıyor.
-- Silinen bir iddia, hiç var olmadığı izlenimi bırakır.
--
-- =========================================================================
-- Neden biri politika, diğeri fonksiyon
-- =========================================================================
--
-- **Veli adı → politika.** `guardians` tablosu ad, kurum bağı, opsiyonel giriş
-- hesabı ve arşiv damgasından ibaret. Hassas sütun yok; satırı açmak yeterli.
--
-- **Öğretmen adı → fonksiyon.** `display_name` hassas değil, ama `profiles`
-- onunla AYNI SATIRDA `recovery_email`, `phone`, `must_change_password` ve
-- `password_expires_at` taşıyor. RLS **satır** düzeyinde çalışır; tabloyu "ad
-- görünsün" diye açmak kurtarma e-postasını ve telefonu da açar — ve bunu
-- yaparken hiçbir hata vermez. Açılan şey istenenden fazla olduğunda kimse
-- fark etmez. Karşılığı `DECISION_LOG` — "Sütun maskeleme RLS'in işi
-- değildir; sıralama bir fonksiyondan gelir"; `exam_ranking` aynı sebeple
-- fonksiyondur.
--
-- =========================================================================
-- Kapsam dar tutuldu
-- =========================================================================
--
-- "Görülebilir" ile "herkese açık" aynı şey değil. Ölçüt yine öğretim
-- ilişkisidir, rol değil (`DECISION_LOG` — "Öğretmenin yazma yetkisi rolünden
-- değil atamasından gelir"):
--
--   * Öğretmen, kurumdaki her velinin değil KENDİ ÖĞRENCİLERİNİN velisini
--     görür.
--   * Öğrenci ve velisi, kurumdaki her üyenin değil GÖRDÜKLERİ SINIFIN
--     öğretmenini görür.
--
-- Reddedilen kısa yol: "aynı kurumdaki herkes birbirinin adını görsün".
-- `organization_memberships` velileri ve öğrencileri de kapsıyor; her öğrenci
-- her velinin adını görürdü. Soru "öğretmenimin adı" idi, cevabı "kurumdaki
-- herkes" değil.
--
-- Mevcut bir sınır KORUNUYOR: `student_guardians_select_guardian` yorumu
-- velinin aynı öğrencinin diğer velisini görmediğini yazıyor (velayet). Bu
-- migration veli tarafına dokunmuyor, yalnız öğretmen yolunu ekliyor.

-- -------------------------------------------------------------------------
-- 1. Öğretmenin veli kapsamı
-- -------------------------------------------------------------------------

create or replace function public.current_user_teaches_guardian(target_guardian_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.student_guardians as link
    where link.guardian_id = target_guardian_id
      and link.archived_at is null
      and public.current_user_teaches_student(link.student_id)
  );
$$;

comment on function public.current_user_teaches_guardian(uuid) is
  'Çağıran, bu velinin bağlı olduğu öğrencilerden en az birine ders veriyor mu. Yalnızca çağıranın kendi kapsamını döndürür. `security definer`: bağ satırının kendisi çağırana kapalı olabilir, kapsam kararı ona bakmadan verilemez.';

grant execute on function public.current_user_teaches_guardian(uuid) to authenticated;

-- Öğretmen, ders verdiği öğrencilerin velisini görür. Arşiv filtresi bilinçli
-- olarak YOK: yönetici politikası da arşivlenmişi eliyor değil, eleme
-- istemcinin işi. İki politika aynı biçimde davranmalı.
create policy guardians_select_teacher on public.guardians
for select to authenticated
using (
  public.current_user_teaches_guardian(id)
  and not (select public.current_user_must_change_password())
);

-- Bağ satırı da açılmak zorunda: bağ görünmezse veli de görünmez. İstemci
-- öğrenciden veliye bu satır üzerinden geçiyor.
create policy student_guardians_select_teacher on public.student_guardians
for select to authenticated
using (
  public.current_user_teaches_student(student_id)
  and not (select public.current_user_must_change_password())
);

-- -------------------------------------------------------------------------
-- 2. Sınıfın öğretmen adları — `profiles` açılmadan
-- -------------------------------------------------------------------------

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
    select visible.id as class_id, visible.mentor_membership_id as membership_id
    from visible
    where visible.mentor_membership_id is not null
    union
    select assignment.class_id, assignment.membership_id
    from public.class_teachers as assignment
    join visible on visible.id = assignment.class_id
    where assignment.archived_at is null
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
  'Çağıranın GÖREBİLDİĞİ sınıfların mentor ve atanmış öğretmenlerinin görünen adları. Yalnız `display_name` döner; `profiles` tablosu açılmaz, çünkü aynı satır `recovery_email`, `phone` ve şifre kilidi durumunu da taşır ve RLS sütun gizleyemez (#228). Görünürlük ölçütü sınıfın kendisidir: göremediğin bir sınıfın öğretmenini de göremezsin.';

grant execute on function public.class_staff_names(uuid[]) to authenticated;
