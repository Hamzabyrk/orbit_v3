-- v1.4-08 · Son yönetici kurumu terk edemez (#282)
--
-- =========================================================================
-- 1. Bu dilim bir borcu ödüyor
-- =========================================================================
--
-- v1.4-07 iki fonksiyona `hedef.role = 'admin'` kapısı koydu ve o kapı
-- **çağıranın kendisini de koruyordu**. Aynı dilimde ayrı bir "çağıran
-- kendini hedef alamaz" kontrolü de yazılmıştı; **K-23 mutasyonu onu
-- erişilemez buldu** — çağıran zorunlu olarak aktif yöneticidir, dolayısıyla
-- kendi üyeliğinin rolü de `admin`'dir ve admin kapısı hep önce ateşlenirdi.
-- Erişilemez dal kaldırıldı ve borç kapının yanına yazıldı:
--
--   > 🔴 v1.4-08'e not: yönetici devri bu kapıyı gevşetmek zorunda. O gün
--   > "çağıran kendini hedef alamaz" kontrolü ayrıca yazılmalı, yoksa son
--   > yönetici kendini indirip kurumu sıfır yöneticiyle bırakabilir.
--
-- **Borcun vadesi geldi — ama ödemesi yazıldığından farklı.** Aşağıya bakınız.
--
-- =========================================================================
-- 2. Ölçüm: teklik şemada bir kural değil
-- =========================================================================
--
-- K-10 turu (2026-09-13) ölçtü:
--
--   `organization_memberships` üzerinde admin'e dair kısıt ........ 0
--   admin'e dair indeks .......................................... 0
--   üretimde kurum başına aktif yönetici ......................... 1, 1
--
-- Yani "kurum başına tek yönetici" bugüne kadar **yaratma yollarının
-- sonucuydu**, yazılı bir kural değil: yöneticiyi `bootstrap-organization`
-- yaratıyor, `internal_create_membership` ise admin üyeliği açmayı açıkça
-- reddediyor.
--
-- `admin` geçen 24 fonksiyon tarandı ve **hiçbiri tekliği varsaymıyor**.
-- `internal_allocate_member_slot`'taki `limit 1` çağıranın **kendi** üyeliği
-- için; kurum başına admin sayısı için değil.
--
-- **Karar (2026-09-13): çoklu yönetici.** Bir yönetici başkasını yönetici
-- yapabilir ve ikisi birden kalabilir; "devir" ayrı bir işlem değil, terfi +
-- kendini indirme.
--
-- **Gerekçe ölçülü:** tek yönetici bugün **kurtarma zincirinin tek arıza
-- noktası**. `PLATFORM_SETTINGS`'in zinciri "öğretmen/öğrenci/veli → kurum
-- yöneticisi → doğrulanmış e-postası → platform operatörü" diyor; yönetici
-- kilitlenirse geri dönüş yalnız `reset-admin-password` ile, yani **platform
-- operatöründen** geçiyor. İkinci bir yönetici o noktayı kaldırıyor.
--
-- =========================================================================
-- 3. Borcun ödemesi bir SAYIM — "kendini hedef alamaz" yasağı değil
-- =========================================================================
--
-- v1.4-07'nin notu "çağıran kendini hedef alamaz" kontrolünü istiyordu.
-- **O kontrol yanlış olurdu ve sebebi şu:** ikinci bir yönetici varken
-- kendini indirmek **meşrudur** — devir tam olarak odur. Yasak, meşru devri
-- engellerdi ve A'nın B'yi indirmesini serbest bırakırdı; yani korumak
-- istediği şeyi korumazdı.
--
-- Doğru kural durumu değil **sonucu** sınıyor (**K-13**): işlem sonrası
-- kurumda **sıfır aktif yönetici** kalacaksa reddet. Tek kural iki durumu
-- birden kapatıyor:
--
--   * Tek yönetici kendini indirmeye çalışır → reddedilir (sıfır kalırdı).
--   * İki yöneticiden biri kendini indirir → geçer (bir tane kalıyor).
--   * Tek yönetici başkasını indirmeye çalışır → o zaten yönetici değil,
--     sayım düşmez, geçer.
--
-- Borç kaydı bu yüzden **düzeltilerek** kapanıyor: not doğru sorunu
-- işaretlemişti, ama önerdiği çözüm eksikti.

create or replace function public.internal_change_member_role(
  caller_user_id uuid,
  target_membership_id uuid,
  new_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hedef public.organization_memberships;
  kalan_yonetici integer;
begin
  select * into hedef
  from public.organization_memberships as membership
  where membership.id = target_membership_id;

  if not found then
    raise exception 'membership not found' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as administrator
    where administrator.user_id = caller_user_id
      and administrator.organization_id = hedef.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
  ) then
    raise exception 'caller is not an active organization administrator'
      using errcode = '42501';
  end if;

  if hedef.role = new_role then
    raise exception 'membership already has this role'
      using errcode = 'ORB04',
            hint = 'Rol zaten bu değerde; bir şey değişmedi.';
  end if;

  -- Son yönetici koruması. Yalnız **yöneticilikten çıkış** sayımı düşürür;
  -- terfi (`new_role = 'admin'`) sayımı artırır ve hiçbir zaman reddedilmez.
  --
  -- ⚠️ `new_role <> 'admin'` koşulu bu noktada **gereksizdir** ve K-23
  -- mutasyonu bunu gösterdi: kaldırdığımda 717 iddia yeşil kaldı. Sebep
  -- yukarıdaki `ORB04` kapısı — `hedef.role = new_role` zaten reddedildiği
  -- için buraya gelindiğinde ikisi eşit olamaz, dolayısıyla `hedef.role`
  -- `admin` ise `new_role` zorunlu olarak `admin` değildir.
  --
  -- Yine de **yazılı bırakılıyor**, çünkü kaldırmak koşulu yukarıdaki kapının
  -- SIRASINA bağlardı: ORB04 kontrolü bir gün aşağı taşınırsa, bu blok sessizce
  -- terfiyi de saymaya başlardı. Gereksiz ama görünür bir koşul, görünmez bir
  -- sıra bağımlılığından iyidir.
  if hedef.role = 'admin' and new_role <> 'admin' then
    select count(*) into kalan_yonetici
    from public.organization_memberships as administrator
    where administrator.organization_id = hedef.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
      and administrator.id <> target_membership_id;

    if kalan_yonetici = 0 then
      raise exception 'the last administrator cannot be demoted'
        using errcode = 'ORB06',
              detail = 'işlem sonrası kalacak aktif yönetici sayısı=0',
              hint = 'Önce başka bir üyeyi yönetici yapın, sonra bu rolü değiştirin.';
    end if;
  end if;

  -- `ORB03` buradan DEĞİL tetikleyiciden gelir ve yutulmaz.
  -- `enforce_role_change_keeps_assignments` terfide erken dönüyor
  -- (`new.role in ('admin','teacher')`), yani yönetici yapmak atama
  -- kontrolüne takılmıyor; ama bir yöneticiyi öğrenciye indirmek ayakta duran
  -- rehberlik veya atama varsa reddediliyor. İstenen davranış bu.
  update public.organization_memberships
  set role = new_role
  where id = target_membership_id;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    hedef.organization_id,
    hedef.branch_id,
    caller_user_id,
    'membership.role_changed',
    'organization_membership',
    target_membership_id,
    jsonb_build_object(
      'from', hedef.role::text,
      'to', new_role::text,
      -- Kendi rolünü değiştirmek artık meşru ve **devir tam olarak budur**.
      -- Defteri okuyanın bunu ayırt edebilmesi gerekiyor.
      'self', (hedef.user_id = caller_user_id)
    )
  );
end;
$$;

comment on function public.internal_change_member_role(uuid, uuid, public.app_role) is
  'Bir üyeliğin rolünü değiştirir; yönetici yapmak ve yöneticilikten indirmek DAHİL (v1.4-08). Çağıran, hedefin kurumunda aktif yönetici olmalıdır. Tek kısıt: işlem sonrası kurumda en az bir aktif yönetici kalmalı (ORB06) — bu, "kendini hedef alamaz" yasağının yerini alır çünkü ikinci yönetici varken kendini indirmek meşrudur (devir). Ayakta duran ders ataması varsa tetikleyici ORB03 ile reddeder. Denetim kaydını kendisi yazar ve işlemin kendi üzerine olup olmadığını (self) kaydeder.';

revoke all on function public.internal_change_member_role(
  uuid, uuid, public.app_role
) from public, anon, authenticated;

grant execute on function public.internal_change_member_role(
  uuid, uuid, public.app_role
) to service_role;

-- =========================================================================
-- 4. Çıkarma — aynı sayım
-- =========================================================================

create or replace function public.internal_remove_member(
  caller_user_id uuid,
  target_membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  hedef public.organization_memberships;
  kalan_yonetici integer;
  kopan_ogrenci uuid;
  kopan_veli uuid;
begin
  select * into hedef
  from public.organization_memberships as membership
  where membership.id = target_membership_id;

  if not found then
    raise exception 'membership not found' using errcode = '23503';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as administrator
    where administrator.user_id = caller_user_id
      and administrator.organization_id = hedef.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
  ) then
    raise exception 'caller is not an active organization administrator'
      using errcode = '42501';
  end if;

  if hedef.status = 'suspended' then
    raise exception 'membership is already suspended'
      using errcode = 'ORB04',
            hint = 'Bu üyelik zaten kurumdan çıkarılmış.';
  end if;

  -- Son yönetici koruması — rol değiştirmedeki sayımın aynısı.
  if hedef.role = 'admin' then
    select count(*) into kalan_yonetici
    from public.organization_memberships as administrator
    where administrator.organization_id = hedef.organization_id
      and administrator.role = 'admin'
      and administrator.status = 'active'
      and administrator.id <> target_membership_id;

    if kalan_yonetici = 0 then
      raise exception 'the last administrator cannot be removed'
        using errcode = 'ORB06',
              detail = 'işlem sonrası kalacak aktif yönetici sayısı=0',
              hint = 'Önce başka bir üyeyi yönetici yapın, sonra bu üyeyi çıkarın.';
    end if;
  end if;

  update public.organization_memberships
  set status = 'suspended'
  where id = target_membership_id;

  -- Öğrenci ve velide bağ da koparılıyor: erişimlerini kesen tek şey o
  -- (v1.4-07 kararı). Yöneticinin akademik kaydı yoktur, dolayısıyla bu
  -- dallar onun için hiç çalışmaz.
  if hedef.role = 'student' then
    update public.students
    set auth_user_id = null
    where auth_user_id = hedef.user_id
      and organization_id = hedef.organization_id
    returning id into kopan_ogrenci;
  elsif hedef.role = 'parent' then
    update public.guardians
    set auth_user_id = null
    where auth_user_id = hedef.user_id
      and organization_id = hedef.organization_id
    returning id into kopan_veli;
  end if;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  values (
    hedef.organization_id,
    hedef.branch_id,
    caller_user_id,
    'membership.removed',
    'organization_membership',
    target_membership_id,
    jsonb_build_object(
      'role', hedef.role::text,
      'unlinked_student_id', kopan_ogrenci,
      'unlinked_guardian_id', kopan_veli,
      'self', (hedef.user_id = caller_user_id)
    )
  );

  if kopan_ogrenci is not null then
    insert into public.audit_events (
      organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    values (
      hedef.organization_id, hedef.branch_id, caller_user_id,
      'student.account_unlinked', 'student', kopan_ogrenci,
      jsonb_build_object('reason', 'membership.removed')
    );
  end if;

  if kopan_veli is not null then
    insert into public.audit_events (
      organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
    )
    values (
      hedef.organization_id, hedef.branch_id, caller_user_id,
      'guardian.account_unlinked', 'guardian', kopan_veli,
      jsonb_build_object('reason', 'membership.removed')
    );
  end if;

  return jsonb_build_object(
    'role', hedef.role::text,
    'unlinked_student_id', kopan_ogrenci,
    'unlinked_guardian_id', kopan_veli
  );
end;
$$;

comment on function public.internal_remove_member(uuid, uuid) is
  'Bir üyeliği kurumdan çıkarır: status = suspended. DELETE yapılmaz ve yapılamaz — üyeliğe bakan sekiz yabancı anahtarın sekizi de RESTRICT. Öğrenci ve velide EK OLARAK akademik kaydın hesap bağı koparılır (v1.4-07). Yönetici de çıkarılabilir (v1.4-08), tek kısıt: işlem sonrası kurumda en az bir aktif yönetici kalmalı (ORB06).';

revoke all on function public.internal_remove_member(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.internal_remove_member(uuid, uuid)
  to service_role;

-- =========================================================================
-- 5. `ORB06` — aileye yeni giren kod
-- =========================================================================
--
-- `ORB01` (dolu kurum silinemez), `ORB02` (kayıt iki ucuna ait değil),
-- `ORB03` (satır bu iş için uygun değil), `ORB04` (zaten kurulu/çakışıyor),
-- `ORB05` (değer izin verilen aralığın dışında) ve şimdi:
--
--   **`ORB06`: bu işlem son yöneticiyi götürürdü.**
--
-- `ORB03`'ten ayrıldı çünkü istemcinin cevabı farklı. `ORB03` "önce şu
-- atamaları arşivle" der ve yol kullanıcının elindedir; `ORB06` "önce başka
-- birini yönetici yap" der — yani **çözüm bir başkasını yetkilendirmektir**,
-- bir şeyi temizlemek değil.
--
-- ⚠️ Kural fonksiyonda, şemada değil. Gerekçe: sayım **işlem sonrası** duruma
-- bakıyor ve bunu bir CHECK kısıtı ifade edemez; tetikleyici ifade ederdi ama
-- her üyelik UPDATE'inde koşardı ve maliyeti ölçülmedi. `service_role` dışında
-- bu tabloya yazan hiçbir yol olmadığı (ölçüldü: `authenticated` için sıfır
-- yazma yetkisi) için fonksiyon sınırı bugün yeterli sınırdır.
