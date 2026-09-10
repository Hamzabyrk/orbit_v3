-- v1.4-00 · Akademik kayıt ile giriş hesabının bağlanması (#261)
--
-- =========================================================================
-- Sorun
-- =========================================================================
--
-- `students.auth_user_id` ve `guardians.auth_user_id` bugüne kadar **hiçbir
-- yerden dolmadı**. `internal_create_membership` bir giriş hesabı açıyor;
-- akademik kayıt açmıyor ve ona dokunmuyor — canlıda ölçüldü, gövdesinde üç
-- insert (`profiles`, `organization_memberships`, `audit_events`) ve sıfır
-- update var.
--
-- Sonucu sessiz: rolü `student` veya `parent` olan bir üyelik açılır, hesap
-- giriş yapar ve **boş panel** görür. Hata görmez, çünkü hata yoktur —
-- öğrenci ve velinin bütün kapsamı tam olarak o iki sütuna bakıyor.
--
-- =========================================================================
-- Neden ayrı bir adım
-- =========================================================================
--
-- Karar 2026-09-10'da verildi (`DECISION_LOG` — "Akademik kayıt ile giriş
-- hesabı ayrı bir adımda bağlanır"): `create-member` sözleşmesi
-- genişletilmiyor. Bir öğrencinin kaydı hesabından **önce** vardır ve çoğu
-- öğrencinin hesabı hiç olmayacak (Soru 4).
--
-- =========================================================================
-- Neden RPC, neden Edge Function değil
-- =========================================================================
--
-- v1.2-01 migration'ı (`20260904120000`) `auth_user_id`'yi bilerek hiçbir
-- yazma yetkisine koymadı ve gerekçesini yazdı:
--
--   > "Sınır şurada duruyor: kimlik işlemleri Edge Function'da kalır. Bu
--   >  yüzden `auth_user_id` hiçbir yazma yetkisinde YOK. Bir öğrenciye giriş
--   >  hesabı bağlamak, adını düzeltmekle aynı sınıfta bir işlem değil;
--   >  yönetici bunu doğrudan UPDATE ile yapamaz."
--
-- O cümlenin **birinci yarısı korunuyor**: yönetici bu sütunu hâlâ doğrudan
-- UPDATE ile yazamıyor, yetki tablosu değişmiyor. İkinci yarısı ise
-- **daraltılıyor** ve ölçüme dayanıyor: bağlama işlemi `service_role`
-- istemiyor. Kimlik yaratmıyor, `auth` şemasına yazmıyor, admin API'sine
-- çıkmıyor — `organization_memberships`'i okuyup `public` şemasındaki bir
-- sütunu yazıyor. `create-member`'dan farkı tam olarak bu.
--
-- Karşılığında kazanılan somut: Edge Function ayrı deploy edilen bir parçadır
-- ve bu bizi #113/#114'te bir kez ısırdı — arayüz deploy edilmemiş bir
-- fonksiyona bağlanmış, form sessizce çalışmamıştı. Bir RPC migration ile
-- birlikte iner ve pgTAP ile tam test edilir.
--
-- Daraltmanın kaydı `DECISION_LOG`'da (K-11): "kimlik **yaratan** işlemler
-- Edge Function'da kalır; var olan iki satırı bağlamak kimlik yaratmaz."
--
-- =========================================================================
-- Kurallar
-- =========================================================================
--
-- `ORB04` — bu aileye yeni giren kod. `ORB01` (dolu kurum silinemez), `ORB02`
-- (kayıt iki ucuna ait değil) ve `ORB03` (işaret edilen satır bu iş için uygun
-- değil) ile aynı ailede, ayrı bir anlam: **"bu bağ zaten kurulu ve
-- çakışıyor"**. `ORB03`'ten ayrıldı çünkü istemcinin verdiği cevap farklı:
-- `ORB03` "başka bir üyelik seç" der, `ORB04` "önce mevcut bağı çöz" der.
--
-- **Rol sorgulanıyor, durum sorgulanmıyor.** v1.2-15'in kurduğu ayrım burada
-- da geçerli: rol bir **kimlik** sorusu ve bağlama anında sorulmalı; durum bir
-- **canlı yetki** sorusu ve onu RLS zaten her istekte soruyor. Karıştırılsaydı
-- henüz aktifleştirilmemiş bir öğrencinin kaydı bağlanamazdı.
--
-- **Rol katı: öğrenci kaydı ↔ `student`, veli kaydı ↔ `parent`** (2026-09-10
-- kararı). Bilinen bedeli ölçüldü ve kayda geçti: kendi çocuğu da o kurumda
-- okuyan bir öğretmen, kurumda zaten `teacher` üyeliği taşıdığı için ikinci
-- bir `parent` üyeliği açamaz — `organization_memberships`'in
-- `(organization_id, user_id)` tekillik indeksi buna izin vermiyor — ve
-- dolayısıyla bir veli kaydına bağlanamaz. Gevşetme kararı v1.4-10'da
-- (veli–öğrenci bağı) yeniden sorulur.
--
-- **Tekillik indeksi kurum bazlı değil, küresel** (`students_auth_user_idx`,
-- `guardians_auth_user_idx`). Yani bir hesap sistemde en fazla bir öğrenci
-- kaydına bağlanabilir. İndeks zaten `23505` ile reddederdi; aşağıdaki kontrol
-- onu daha erken ve okunabilir bir hataya çeviriyor — ve tam olarak bu yüzden
-- **kurum süzgeci taşımıyor**: çakışan kayıt başka bir kurumda olabilir ve
-- indeks onu da reddeder.

-- ---------------------------------------------------------------------------
-- Uygunluk ölçütü — tek yerde
-- ---------------------------------------------------------------------------
--
-- `membership_may_teach` ile aynı kalıp: ölçüt bir kez yazılır, dört fonksiyon
-- da onu çağırır. `authenticated` bunu doğrudan çağırmıyor; aşağıdaki
-- fonksiyonlar zaten sahibin yetkisiyle koşuyor.

create or replace function public.membership_may_be_linked(
  target_membership_id uuid,
  target_organization_id uuid,
  expected_role public.app_role
)
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
      and membership.organization_id = target_organization_id
      and membership.role = expected_role
  );
$$;

comment on function public.membership_may_be_linked(uuid, uuid, public.app_role) is
  'Bu üyelik, bu kurumdaki bu tür akademik kayda bağlanabilir mi: aynı kurumda olmalı ve rolü beklenen rol olmalı. Durum (status) bilinçli olarak sorulmaz — v1.2-15 ile aynı ayrım.';

revoke all on function public.membership_may_be_linked(uuid, uuid, public.app_role)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Öğrenci kaydına giriş hesabı bağlama
-- ---------------------------------------------------------------------------

create or replace function public.link_student_account(
  target_student_id uuid,
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kayit public.students;
  uyelik public.organization_memberships;
begin
  select * into kayit
  from public.students as ogrenci
  where ogrenci.id = target_student_id
    and ogrenci.archived_at is null;

  if not found then
    raise exception 'Öğrenci kaydı bulunamadı.' using errcode = '23503';
  end if;

  -- Yetki, `students_update_admin` politikasının aynısı: şube yöneticisi
  -- yalnız kendi şubesinde, kurum yöneticisi her şubede. Bu fonksiyon
  -- `security definer` olduğu için RLS koşmuyor; kontrol elle yapılmak
  -- zorunda ve politikayla **aynı yüklem** kullanılıyor ki ikisi ayrışmasın.
  if not public.current_user_has_membership(
       kayit.organization_id, kayit.branch_id, array['admin']::public.app_role[]
     )
     or public.current_user_must_change_password() then
    raise exception 'Bu işlem için kurum yöneticisi olmanız gerekiyor.'
      using errcode = '42501';
  end if;

  select * into uyelik
  from public.organization_memberships as membership
  where membership.id = target_membership_id;

  if not found then
    raise exception 'Üyelik bulunamadı.' using errcode = '23503';
  end if;

  if not public.membership_may_be_linked(
       target_membership_id, kayit.organization_id, 'student'::public.app_role
     ) then
    raise exception 'Bu üyelik bir öğrenci kaydına bağlanamaz.'
      using errcode = 'ORB03',
            detail = 'Üyelik aynı kurumda ve rolü student olmalıdır.';
  end if;

  -- Aynı hesaba yeniden bağlama: hata değil, **hiçbir şey**. Tekrarlanan
  -- istek ikinci bir istek değil (v1.2-17 ile aynı ilke). Denetim kaydı da
  -- yazılmıyor: yazılsaydı defterde hiç olmamış bir değişiklik görünürdü.
  if kayit.auth_user_id = uyelik.user_id then
    return;
  end if;

  if kayit.auth_user_id is not null then
    raise exception 'Bu öğrenci kaydı zaten başka bir hesaba bağlı.'
      using errcode = 'ORB04',
            detail = 'Önce mevcut bağ çözülmelidir.';
  end if;

  if exists (
    select 1
    from public.students as digeri
    where digeri.auth_user_id = uyelik.user_id
      and digeri.id <> target_student_id
  ) then
    raise exception 'Bu hesap başka bir öğrenci kaydına bağlı.'
      using errcode = 'ORB04',
            detail = 'Bir hesap sistemde en fazla bir öğrenci kaydına bağlanabilir.';
  end if;

  update public.students as ogrenci
  set auth_user_id = uyelik.user_id
  where ogrenci.id = target_student_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    kayit.organization_id,
    kayit.branch_id,
    auth.uid(),
    'student.account_linked',
    'student',
    target_student_id,
    jsonb_build_object(
      'membership_id', target_membership_id,
      'person_code', uyelik.person_code
    )
  );
end;
$$;

comment on function public.link_student_account(uuid, uuid) is
  'Öğrenci kaydına bir giriş hesabı bağlar. Yalnız o kaydın kurum/şube yöneticisi çağırabilir; üyelik aynı kurumda ve rolü student olmalıdır. Aynı hesaba yeniden bağlamak sessiz no-op.';

revoke all on function public.link_student_account(uuid, uuid) from public, anon;
grant execute on function public.link_student_account(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Öğrenci kaydının bağını çözme
-- ---------------------------------------------------------------------------
--
-- **Arşivlenmiş kayıt da çözülebilir** ve bu bilinçli: tekillik indeksi küresel
-- olduğu için arşivde duran bağlı bir kayıt, o hesabın başka bir kayda
-- bağlanmasını kalıcı olarak engeller. Çözme bir düzeltme işlemi; bağlamanın
-- aksine arşiv onu kilitlememeli.

create or replace function public.unlink_student_account(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kayit public.students;
  uyelik public.organization_memberships;
begin
  select * into kayit
  from public.students as ogrenci
  where ogrenci.id = target_student_id;

  if not found then
    raise exception 'Öğrenci kaydı bulunamadı.' using errcode = '23503';
  end if;

  if not public.current_user_has_membership(
       kayit.organization_id, kayit.branch_id, array['admin']::public.app_role[]
     )
     or public.current_user_must_change_password() then
    raise exception 'Bu işlem için kurum yöneticisi olmanız gerekiyor.'
      using errcode = '42501';
  end if;

  -- Zaten bağsız: no-op. Bağlamadaki ilkenin aynısı.
  if kayit.auth_user_id is null then
    return;
  end if;

  select * into uyelik
  from public.organization_memberships as membership
  where membership.organization_id = kayit.organization_id
    and membership.user_id = kayit.auth_user_id;

  update public.students as ogrenci
  set auth_user_id = null
  where ogrenci.id = target_student_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    kayit.organization_id,
    kayit.branch_id,
    auth.uid(),
    'student.account_unlinked',
    'student',
    target_student_id,
    case
      when uyelik.id is null then '{}'::jsonb
      else jsonb_build_object('membership_id', uyelik.id, 'person_code', uyelik.person_code)
    end
  );
end;
$$;

comment on function public.unlink_student_account(uuid) is
  'Öğrenci kaydının giriş hesabı bağını çözer. Arşivlenmiş kayıtta da çalışır: küresel tekillik indeksi yüzünden bağlı kalan arşiv kaydı hesabı kilitler. Zaten bağsızsa sessiz no-op.';

revoke all on function public.unlink_student_account(uuid) from public, anon;
grant execute on function public.unlink_student_account(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Veli kaydına giriş hesabı bağlama
-- ---------------------------------------------------------------------------
--
-- `guardians` tablosunda `branch_id` yok — veli kurumun tamamına aittir, tek
-- bir şubeye değil. Yetki kontrolü bu yüzden `guardians_update_admin`
-- politikasıyla aynı biçimde şubeyi NULL geçiyor: şube yöneticisi de veli
-- kaydını yönetebilir.

create or replace function public.link_guardian_account(
  target_guardian_id uuid,
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kayit public.guardians;
  uyelik public.organization_memberships;
begin
  select * into kayit
  from public.guardians as veli
  where veli.id = target_guardian_id
    and veli.archived_at is null;

  if not found then
    raise exception 'Veli kaydı bulunamadı.' using errcode = '23503';
  end if;

  if not public.current_user_has_membership(
       kayit.organization_id, null, array['admin']::public.app_role[]
     )
     or public.current_user_must_change_password() then
    raise exception 'Bu işlem için kurum yöneticisi olmanız gerekiyor.'
      using errcode = '42501';
  end if;

  select * into uyelik
  from public.organization_memberships as membership
  where membership.id = target_membership_id;

  if not found then
    raise exception 'Üyelik bulunamadı.' using errcode = '23503';
  end if;

  if not public.membership_may_be_linked(
       target_membership_id, kayit.organization_id, 'parent'::public.app_role
     ) then
    raise exception 'Bu üyelik bir veli kaydına bağlanamaz.'
      using errcode = 'ORB03',
            detail = 'Üyelik aynı kurumda ve rolü parent olmalıdır.';
  end if;

  if kayit.auth_user_id = uyelik.user_id then
    return;
  end if;

  if kayit.auth_user_id is not null then
    raise exception 'Bu veli kaydı zaten başka bir hesaba bağlı.'
      using errcode = 'ORB04',
            detail = 'Önce mevcut bağ çözülmelidir.';
  end if;

  if exists (
    select 1
    from public.guardians as digeri
    where digeri.auth_user_id = uyelik.user_id
      and digeri.id <> target_guardian_id
  ) then
    raise exception 'Bu hesap başka bir veli kaydına bağlı.'
      using errcode = 'ORB04',
            detail = 'Bir hesap sistemde en fazla bir veli kaydına bağlanabilir.';
  end if;

  update public.guardians as veli
  set auth_user_id = uyelik.user_id
  where veli.id = target_guardian_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    kayit.organization_id,
    null,
    auth.uid(),
    'guardian.account_linked',
    'guardian',
    target_guardian_id,
    jsonb_build_object(
      'membership_id', target_membership_id,
      'person_code', uyelik.person_code
    )
  );
end;
$$;

comment on function public.link_guardian_account(uuid, uuid) is
  'Veli kaydına bir giriş hesabı bağlar. Yalnız o kurumun yöneticisi çağırabilir; üyelik aynı kurumda ve rolü parent olmalıdır. Aynı hesaba yeniden bağlamak sessiz no-op.';

revoke all on function public.link_guardian_account(uuid, uuid) from public, anon;
grant execute on function public.link_guardian_account(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Veli kaydının bağını çözme
-- ---------------------------------------------------------------------------

create or replace function public.unlink_guardian_account(target_guardian_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kayit public.guardians;
  uyelik public.organization_memberships;
begin
  select * into kayit
  from public.guardians as veli
  where veli.id = target_guardian_id;

  if not found then
    raise exception 'Veli kaydı bulunamadı.' using errcode = '23503';
  end if;

  if not public.current_user_has_membership(
       kayit.organization_id, null, array['admin']::public.app_role[]
     )
     or public.current_user_must_change_password() then
    raise exception 'Bu işlem için kurum yöneticisi olmanız gerekiyor.'
      using errcode = '42501';
  end if;

  if kayit.auth_user_id is null then
    return;
  end if;

  select * into uyelik
  from public.organization_memberships as membership
  where membership.organization_id = kayit.organization_id
    and membership.user_id = kayit.auth_user_id;

  update public.guardians as veli
  set auth_user_id = null
  where veli.id = target_guardian_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    kayit.organization_id,
    null,
    auth.uid(),
    'guardian.account_unlinked',
    'guardian',
    target_guardian_id,
    case
      when uyelik.id is null then '{}'::jsonb
      else jsonb_build_object('membership_id', uyelik.id, 'person_code', uyelik.person_code)
    end
  );
end;
$$;

comment on function public.unlink_guardian_account(uuid) is
  'Veli kaydının giriş hesabı bağını çözer. Arşivlenmiş kayıtta da çalışır; zaten bağsızsa sessiz no-op.';

revoke all on function public.unlink_guardian_account(uuid) from public, anon;
grant execute on function public.unlink_guardian_account(uuid) to authenticated;
