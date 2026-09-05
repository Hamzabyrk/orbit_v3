-- v1.2-15 · Rol korkuluğu — yabancı anahtar "var mı" der, "olmalı mı" demez
--
-- 2026-09-05 kapsam turu üç sütun buldu; üçü de bir **üyeliğe** işaret ediyor
-- ve üçü de o üyeliğin **rolünü** sormuyordu:
--
--   * `class_teachers.membership_id`    → tam öğretmen kapsamı
--   * `classes.mentor_membership_id`    → aynısı (rehber öğretmen de "ders
--     veriyor" sayılıyor, `current_user_teaches_class` ikisini birleştiriyor)
--   * `schedule_entries.membership_id`  → yalnızca o program satırında okuma
--
-- Yani rolü `parent` olan bir üyelik bir sınıfa atanırsa o kişi **öğretmen
-- olur**: yoklama oturumu açar, yoklama yazar, ödev verir, sınav sonucu girer
-- ve sınıfın bütün öğrencilerini okur. Bileşik yabancı anahtarlar bu satırın
-- doğru kuruma ait olduğunu kusursuz biçimde garanti ediyordu — ama **uygun**
-- olduğunu hiç sormuyordu. Kural olarak **K-18**'e yazıldı.
--
-- **Doğru kısıt "rol teacher olmalı" DEĞİLDİR.** v1.2-02 kararı adminin de ders
-- vermesine bilinçli olarak izin veriyor: `class_teachers` role değil üyeliğe
-- bağlanır ve rolü `admin` olan biri ikinci bir üyeliğe ihtiyaç duymadan ders
-- verebilir. Dışlanması gerekenler `student` ve `parent`.
--
-- **Rol sorgulanıyor, durum sorgulanmıyor.** `status = 'active'` şartı bilinçli
-- olarak konulmadı: durum bir **canlı yetki** sorusu ve `current_user_teaches_class`
-- onu zaten soruyor — askıya alınmış bir öğretmenin ataması hiçbir şey açmaz.
-- Rol ise bir **kimlik** sorusu ve atama anında sorulmalı. Karıştırılsaydı,
-- henüz aktifleştirilmemiş bir öğretmene ders atamak imkânsız olurdu.
--
-- Mekanizma gerekçesi v1.2-14 ile aynı ve `DECISION_LOG`'da: yetki RLS'te,
-- bütünlük şemada durur. `service_role` RLS'i atlar; kural, yazanın kim
-- olduğundan bağımsız olmalıdır.
--
-- `ORB03`: `ORB01` (dolu kurum silinemez) ve `ORB02` (kayıt iki ucuna ait
-- değil) ile aynı ailede, ayrı bir anlam — "işaret edilen satır bu iş için
-- uygun değil". İstemcinin üç redde farklı cevap verebilmesi için ayrıldı.

-- ---------------------------------------------------------------------------
-- Uygunluk ölçütü — tek yerde
-- ---------------------------------------------------------------------------

create or replace function public.membership_may_teach(target_membership_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_memberships as membership
    where membership.id = target_membership_id
      and membership.role in ('admin', 'teacher')
  );
$$;

comment on function public.membership_may_teach(uuid) is
  'Bu üyelik ders verme ataması taşıyabilir mi: rolü admin veya teacher olmalı (K-18). Durum (status) bilinçli olarak sorulmaz; onu current_user_teaches_class soruyor.';

-- `authenticated` bu fonksiyonu çağırmıyor — yalnızca aşağıdaki trigger'lar
-- kullanıyor ve onlar zaten sahibin yetkisiyle koşuyor. Açık bırakmak,
-- advisor 0029 sayısını sebepsiz büyütmekten başka bir şey yapmazdı.
revoke all on function public.membership_may_teach(uuid)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Ders ataması, öğrenci veya veliye yapılamaz
-- ---------------------------------------------------------------------------

create or replace function public.enforce_class_teacher_is_eligible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.membership_may_teach(new.membership_id) then
    raise exception 'Bu üyelik ders ataması taşıyamaz.'
      using errcode = 'ORB03',
            detail = format('membership_id=%s', new.membership_id),
            hint = 'Yalnızca rolü admin veya teacher olan üyelikler sınıfa atanabilir.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_class_teacher_is_eligible() is
  'class_teachers.membership_id yalnızca admin veya teacher rolündeki bir üyeliği gösterebilir (K-18).';

revoke all on function public.enforce_class_teacher_is_eligible()
  from public, anon, authenticated;

create trigger class_teachers_membership_is_eligible
before insert or update on public.class_teachers
for each row execute function public.enforce_class_teacher_is_eligible();

-- ---------------------------------------------------------------------------
-- 2. Rehber öğretmen de aynı ölçüte tabidir
-- ---------------------------------------------------------------------------
--
-- Ayrı bir trigger gerekiyor çünkü sütun opsiyonel: rehberi olmayan sınıf
-- geçerli bir sınıftır.

create or replace function public.enforce_class_mentor_is_eligible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.mentor_membership_id is not null
     and not public.membership_may_teach(new.mentor_membership_id) then
    raise exception 'Bu üyelik sınıfın rehber öğretmeni olamaz.'
      using errcode = 'ORB03',
            detail = format('mentor_membership_id=%s', new.mentor_membership_id),
            hint = 'Rehberlik de ders verme kapsamı açar; yalnızca admin veya teacher atanabilir.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_class_mentor_is_eligible() is
  'classes.mentor_membership_id yalnızca admin veya teacher rolündeki bir üyeliği gösterebilir (K-18). Rehberlik current_user_teaches_class içinde ders vermekle aynı kapsamı açıyor.';

revoke all on function public.enforce_class_mentor_is_eligible()
  from public, anon, authenticated;

create trigger classes_mentor_is_eligible
before insert or update on public.classes
for each row execute function public.enforce_class_mentor_is_eligible();

-- ---------------------------------------------------------------------------
-- 3. Program satırındaki kişi de aynı ölçüte tabidir
-- ---------------------------------------------------------------------------
--
-- Bu üçünün en dar etkilisi: `schedule_entries.membership_id`
-- `current_user_teaches_class`'ı beslemiyor, dolayısıyla ders verme kapsamı
-- AÇMIYOR. Açtığı tek şey `schedule_entries_select_teacher` politikasının
-- ikinci dalı — satır kime yazılmışsa o kişi satırı okuyabiliyor (vekil
-- öğretmen yolu) ve o dal role bakmıyor.
--
-- Yine de korunuyor: "Pazartesi 09:00 Matematik'i veli X veriyor" satırı,
-- kimse onu okuyamasa bile yanlış bir kayıttır.

create or replace function public.enforce_schedule_membership_is_eligible()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.membership_id is not null
     and not public.membership_may_teach(new.membership_id) then
    raise exception 'Bu üyelik ders programına yazılamaz.'
      using errcode = 'ORB03',
            detail = format('membership_id=%s', new.membership_id),
            hint = 'Program satırındaki kişi dersi veren kişidir; yalnızca admin veya teacher olabilir.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_schedule_membership_is_eligible() is
  'schedule_entries.membership_id yalnızca admin veya teacher rolündeki bir üyeliği gösterebilir (K-18).';

revoke all on function public.enforce_schedule_membership_is_eligible()
  from public, anon, authenticated;

create trigger schedule_entries_membership_is_eligible
before insert or update on public.schedule_entries
for each row execute function public.enforce_schedule_membership_is_eligible();

-- ---------------------------------------------------------------------------
-- 4. Rol, ayakta duran bir atamanın altından çekilemez
-- ---------------------------------------------------------------------------
--
-- Üç trigger yalnızca atama anını koruyor. Kuralın tam hâli için ters yön de
-- gerekiyor: bir öğretmen sınıfa atandıktan SONRA rolü `parent`'a çevrilirse,
-- atama satırı yerinde kalır ve kişi öğretmen kapsamını korurdu. v1.2-14'teki
-- "ebeveyn sonradan taşınamaz" korumasının aynısı, bu kez rol ekseninde.
--
-- **Yalnızca arşivlenmemiş atamalar engelliyor** ve bu, 3. maddedeki
-- `status` gerekçesinin devamı: burada sorulan şey **canlı yetki**, geçmiş
-- değil. Ölçüt `current_user_teaches_class`'ın okuduğu şeyle birebir aynı
-- tutuldu — o `assignment.archived_at is null` ve rehber için
-- `class_row.archived_at is null` arıyor. Kapı ile kapının koruduğu şey aynı
-- satırlara bakmazsa, aradaki fark bir açıktır.
--
-- (Bilinçli asimetri: v1.2-14'te arşivlenmiş sınıf kaydı **sayılıyordu**,
-- çünkü orada sorulan "bu öğrencinin bu sınıfla bir ilişkisi var mıydı" —
-- geçmişe ait bir kanıt. Burada sorulan "bu üyelik şu anda yetki taşıyor mu".)
--
-- Yönetici rolü değiştirmek istiyorsa önce atamaları arşivler; hangi
-- atamaların engellediği `detail` alanında dönüyor.

create or replace function public.enforce_role_change_keeps_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ders_atamasi integer;
  rehberlik integer;
  program_satiri integer;
begin
  if new.role is not distinct from old.role
     or new.role in ('admin', 'teacher') then
    return new;
  end if;

  select count(*) into ders_atamasi
  from public.class_teachers as atama
  where atama.membership_id = new.id
    and atama.archived_at is null;

  select count(*) into rehberlik
  from public.classes as sinif
  where sinif.mentor_membership_id = new.id
    and sinif.archived_at is null;

  select count(*) into program_satiri
  from public.schedule_entries as satir
  where satir.membership_id = new.id
    and satir.archived_at is null;

  if ders_atamasi + rehberlik + program_satiri > 0 then
    raise exception 'Bu üyeliğin rolü değiştirilemez: ayakta duran ders ataması var.'
      using errcode = 'ORB03',
            detail = format(
              'ders ataması=%s, rehberlik=%s, program satırı=%s',
              ders_atamasi, rehberlik, program_satiri
            ),
            hint = 'Önce ilgili atamaları arşivleyin, sonra rolü değiştirin.';
  end if;

  return new;
end;
$$;

comment on function public.enforce_role_change_keeps_assignments() is
  'Ayakta duran bir ders ataması varken üyeliğin rolü student/parent yapılamaz (K-18). Arşivlenmiş atamalar engellemez: ölçüt current_user_teaches_class ile birebir aynı satırlara bakar.';

revoke all on function public.enforce_role_change_keeps_assignments()
  from public, anon, authenticated;

create trigger memberships_role_change_keeps_assignments
before update on public.organization_memberships
for each row execute function public.enforce_role_change_keeps_assignments();
