-- Koparamadığın bir bağ, bir seçim değildir (v1.5-07, #319).
--
-- §4.15'in üç bulgusunun karşılığı: B1 · B2 · B3.
--
-- =========================================================================
-- 🔴 B1 — karar bir şart yazmış, kod onu yalnız BİR tarafta uyguluyor
-- =========================================================================
--
-- 2026-09-14 kararı: _"`must_change_password` kapalı olmalı"_. Şart
-- `link_accounts`'ta (kodu TÜKETEN taraf) var, `issue_account_link_code`'da
-- (kodu ÜRETEN taraf) yok. Açtığı yol, kararın kapattığını söylediği yolun
-- kendisi:
--
--   1. Yönetici, kâğıt fişteki GEÇİCİ şifreyle üyenin hesabına girer
--   2. O hesapta bağlama kodu ÜRETİR — bugün hiçbir engel yok
--   3. Kodu kendi hesabında tüketir (orada şart var ama kendi şifresi zaten
--      değişmiş durumda, yani şart onu engellemiyor)
--   4. `switch-account` ona o hesaba KALICI ve SESSİZ bir oturum verir
--
-- Şifre sıfırlamaktan farkı şu: sıfırlama **gürültülüdür** — üye giriş
-- yapamayınca fark eder ve sorar. Bu yol sessizdir; üyenin şifresi çalışmaya
-- devam eder ve ona bir şey olmuş gibi görünmez.
--
-- Düzeltme tek konjonksiyon. Kararın yarısı uygulanmıştı; diğer yarısı burada.
--
-- =========================================================================
-- 🔴 B2 — bağı koparan hiçbir yol yoktu
-- =========================================================================
--
-- Tarandı: canlı şemada, migration'larda, serviste, arayüzde bağı koparan
-- hiçbir şey yok. `profiles.person_id` yalnız **değer alıyor**, `null`'a hiç
-- çekilmiyor; `authenticated` onu yazamıyor ve bunu sabitleyen bir test var.
-- Kalan tek yol `service_role` ile elle müdahale — projenin kendi kuralının
-- yasakladığı şey.
--
-- Yani yanlış kurulmuş bir bağın **ürün üzerinden geri alınma yolu yoktu**, ve
-- B1'in açtığı yol tam olarak yanlış bir bağ kurmanın yolu. İkisi birlikte
-- **sessiz ve geri alınamaz** bir yetki kalıcılığı demekti.
--
-- Koparma yetkisi **kişinin kendisinde** (karar 2026-09-16). Yöneticide değil:
-- yönetici koparabilse, B1'i kullanan kişi izini de temizleyebilirdi.
--
-- ⚠️ **Grup tek hesaba düştüğünde o hesabın da bağı çözülür.** Sebep: amaç "bir hesabı gruptan çıkarmak" değil, **yanlış
-- kurulmuş bir bağı geri almak**. Geriye `person_id`'si dolu ama yalnız bir
-- hesap kalsaydı, o hesap yeni bir kodla aynı gruba tekrar bağlanabilirdi ve
-- koparma yarım kalmış olurdu. Kalan hesap tanım gereği **aynı kişinin**
-- hesabı — başka birinin kaydına dokunulmuyor.
--
-- =========================================================================
-- B3 — menü tutamayacağı söz veriyordu
-- =========================================================================
--
-- `my_linked_accounts` çağıranın kendi kilidine bakıyor ama **listelediklerin**
-- kilidine bakmıyordu. Kilitli bir hesap menüde görünüyor, ona geçen kişi
-- hiçbir şey okuyamıyor (bütün politikalar kilitle kapalı). Veri sızmıyor ama
-- ürün yapamayacağı bir şeyi teklif ediyor (**K-22**).
--
-- Menü süzgeci **görünen** kısım; asıl kapı `internal_begin_account_switch`.
-- Menüyü süzüp kapıyı açık bırakmak, kapıyı hiç yazmamakla aynı şey olurdu:
-- `switch-account` doğrudan çağrılabilir.
--
-- ⚠️ Çağıran tarafındaki kilit kontrolü de düzeltiliyor: bugün yalnız
-- `must_change_password`'e bakıyor, oysa `current_user_must_change_password()`
-- **hem** onu **hem** `password_expires_at`'i kontrol ediyor. Yani süresi
-- dolmuş şifreyle hesap değiştirmek bugün mümkün, hâlbuki o hesap hiçbir şey
-- okuyamıyor. İki taraf da yardımcının ifadesiyle hizalanıyor.

-- ---------------------------------------------------------------------------
-- B1 · Kodu ÜRETEN tarafta kilit şartı
-- ---------------------------------------------------------------------------
create or replace function public.issue_account_link_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  benim_kimligim uuid := (select auth.uid());
  ham_kod text;
begin
  if benim_kimligim is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  -- 🔴 B1. Kararın diğer yarısı. Geçici şifresini devralmamış bir hesap
  -- kendini bağlanmaya AÇAMAZ — çünkü o şifreyi elinde tutan kişi hesabın
  -- sahibi olmayabilir.
  if exists (
    select 1 from public.profiles as ben
    where ben.id = benim_kimligim
      and (
        ben.must_change_password
        or (ben.password_expires_at is not null and ben.password_expires_at <= now())
      )
  ) then
    raise exception 'Bağlama kodu almadan önce geçici şifrenizi değiştirin.'
      using errcode = 'ORB03',
            detail = 'issuer_password_not_taken_over';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as uyelik
    where uyelik.user_id = benim_kimligim
      and uyelik.status = 'active'
  ) then
    raise exception 'Bu hesabın aktif bir üyeliği yok.'
      using errcode = 'ORB03',
            detail = 'issuer_without_membership';
  end if;

  update public.account_link_codes as eski
     set expires_at = now()
   where eski.issuer_user_id = benim_kimligim
     and eski.consumed_at is null
     and eski.expires_at > now();

  ham_kod := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.account_link_codes (code_hash, issuer_user_id, expires_at)
  values (
    encode(sha256(convert_to(ham_kod, 'utf8')), 'hex'),
    benim_kimligim,
    now() + interval '10 minutes'
  );

  return ham_kod;
end;
$$;

comment on function public.issue_account_link_code() is
  'Bağlama kodu üretir. Çağıranın geçici şifresini DEVRALMIŞ olması şarttır (v1.5-07/B1): aksi hâlde kâğıt fişteki şifreyi eline geçiren biri o hesabı bağlanmaya açabilir ve kalıcı, sessiz bir oturum elde eder. Aynı anda tek canlı kod olur.';

-- ---------------------------------------------------------------------------
-- B2 · Bağı koparma
-- ---------------------------------------------------------------------------
create or replace function public.unlink_accounts()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  benim_kimligim uuid := (select auth.uid());
  kisi_id uuid;
  etkilenen uuid[];
  kalan bigint;
begin
  if benim_kimligim is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  -- Diğer bağ işlemleriyle aynı şart. Kilitli bir hesap hiçbir şey okuyamıyor,
  -- dolayısıyla bu bir tuzak değil: şifre değiştirilip tekrar denenir. Şart
  -- olmasaydı, geçici şifreyi eline geçiren biri kurbanın MEŞRU bağını
  -- koparabilirdi.
  if exists (
    select 1 from public.profiles as ben
    where ben.id = benim_kimligim
      and (
        ben.must_change_password
        or (ben.password_expires_at is not null and ben.password_expires_at <= now())
      )
  ) then
    raise exception 'Bağı koparmadan önce geçici şifrenizi değiştirin.'
      using errcode = 'ORB03',
            detail = 'password_not_taken_over';
  end if;

  select ben.person_id into kisi_id
    from public.profiles as ben
   where ben.id = benim_kimligim;

  if kisi_id is null then
    raise exception 'Bu hesap başka bir hesaba bağlı değil.'
      using errcode = 'ORB03',
            detail = 'not_linked';
  end if;

  -- Denetim izi için, bağ çözülmeden ÖNCE gruptaki hesaplar toplanıyor.
  select array_agg(hesap.id) into etkilenen
    from public.profiles as hesap
   where hesap.person_id = kisi_id;

  update public.profiles set person_id = null where id = benim_kimligim;

  select count(*) into kalan
    from public.profiles as hesap
   where hesap.person_id = kisi_id;

  -- Grup tek hesaba düştüyse bağ tamamen çözülür: yarım kalmış bir grup,
  -- aynı kişi kaydına yeniden bağlanmanın yolu olurdu.
  --
  -- ⚠️ `people` satırı SİLİNMİYOR ve bunu **Yıkıcı Migration Kontrolü**
  -- düşündürdü. İlk yazımda burada `delete from public.people` vardı, kapı
  -- onu yakaladı ve `-- ALLOW-DESTRUCTIVE` kaçış yolu kullanılmadı: silmeye
  -- **gerek yoktu.** Güvenlik özelliği "o kişi kaydına bağlı hesap kalmaması"
  -- ve onu yukarıdaki `update` sağlıyor. Sahipsiz kalan `people` satırı
  -- opak bir kimlikten başka bir şey taşımıyor; kimse ona bakmıyor,
  -- `my_linked_accounts` ve geçiş kapısı `person_id` üzerinden çalışıyor.
  --
  -- Emsal aynı ailenin bir önceki migration'ı: `issue_account_link_code`'da
  -- eski kodu silmek yerine süresi bitiriliyor, gerekçesi de "silmeye gerek
  -- yoktu". Aynı kapı, aynı cevap.
  if kalan <= 1 then
    update public.profiles set person_id = null where person_id = kisi_id;
    kalan := 0;
  end if;

  -- Etkilenen her hesabın her aktif üyeliğinin kurumuna bir denetim satırı.
  -- Bir kurum yalnız KENDİ üyesine ait olayı görür; başka kurumun hesabı
  -- o kuruma yazılmıyor.
  insert into public.audit_events (
    organization_id, branch_id, actor_user_id, action, entity_type, entity_id, metadata
  )
  select
    uyelik.organization_id,
    uyelik.branch_id,
    benim_kimligim,
    'account_link.severed',
    'profile',
    uyelik.user_id,
    jsonb_build_object(
      'severed_by_self', uyelik.user_id = benim_kimligim,
      'remaining_linked_accounts', kalan
    )
  from public.organization_memberships as uyelik
  where uyelik.user_id = any(etkilenen)
    and uyelik.status = 'active';

  return kalan;
end;
$$;

comment on function public.unlink_accounts() is
  'Çağıranın hesap bağını koparır ve geriye kalan bağlı hesap sayısını döndürür. Yetki KİŞİNİN KENDİSİNDE (karar 2026-09-16): yönetici koparabilse, bağı hatalı kuran kişi izini de temizleyebilirdi. Grup tek hesaba düştüğünde bağ tamamen çözülür — amaç gruptan çıkarmak değil, yanlış kurulmuş bağı geri almaktır. Sahipsiz kalan `people` satırı silinmez: güvenlik özelliği bağın kopması, satırın yok olması değil. Etkilenen her hesabın kurumuna `account_link.severed` denetim satırı yazılır.';

revoke all on function public.unlink_accounts() from public, anon;
grant execute on function public.unlink_accounts() to authenticated;

-- ---------------------------------------------------------------------------
-- B3 · Hedefin kilidi — hem menüde hem kapıda
-- ---------------------------------------------------------------------------
create or replace function public.my_linked_accounts()
returns table (
  user_id uuid,
  display_name text,
  role public.app_role,
  organization_id uuid,
  organization_name text,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    hesap.id as user_id,
    hesap.display_name,
    uyelik.role,
    uyelik.organization_id,
    kurum.name as organization_name,
    (hesap.id = (select auth.uid())) as is_current
  from public.profiles as ben
  join public.profiles as hesap
    on hesap.person_id = ben.person_id
  join public.organization_memberships as uyelik
    on uyelik.user_id = hesap.id
   and uyelik.status = 'active'
  join public.organizations as kurum
    on kurum.id = uyelik.organization_id
  where ben.id = (select auth.uid())
    and not (select public.current_user_must_change_password())
    -- 🔴 B3. Hedefin KENDİ kilidi. Kilitli bir hesap menüde görünmez, çünkü
    -- ona geçen kişi hiçbir şey okuyamaz (K-22: tutamayacağın sözü vermezsin).
    and not (
      hesap.must_change_password
      or (hesap.password_expires_at is not null and hesap.password_expires_at <= now())
    )
  order by kurum.name, uyelik.role, hesap.id;
$$;

comment on function public.my_linked_accounts() is
  'Çağıranla aynı kişi kaydına bağlı, aktif üyeliği olan hesaplar. Hem çağıranın hem HEDEFİN şifre kilidi süzülür (v1.5-07/B3): kilitli bir hesaba geçen kişi hiçbir şey okuyamaz, o yüzden menüde de görünmez. Menü süzgeci görünen kısımdır; asıl kapı `internal_begin_account_switch`.';

-- ---------------------------------------------------------------------------
-- B3 · Asıl kapı: hedefin kilidi ve çağıranın süresi dolmuş şifresi
-- ---------------------------------------------------------------------------
-- Gövde canlı şemadan (`pg_get_functiondef`) alındı, migration metninden
-- DEĞİL — o ders 20260924000000'de ödendi. Değişen tek şey aşağıdaki iki
-- kilit kontrolü; gerisi birebir aynı.
create or replace function public.internal_begin_account_switch(
  caller_user_id uuid,
  target_user_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hedef_eposta text;
  hedef_kurum record;
begin
  if caller_user_id is null or target_user_id is null then
    raise exception 'caller and target are required' using errcode = '42501';
  end if;

  if caller_user_id = target_user_id then
    raise exception 'cannot switch to the same account' using errcode = '42501';
  end if;

  -- Çağıranın kilidi. ⚠️ Eskiden yalnız `must_change_password`'e bakıyordu;
  -- `current_user_must_change_password()` ise HEM onu HEM `password_expires_at`'i
  -- kontrol ediyor. Yani süresi dolmuş şifreyle hesap değiştirmek mümkündü,
  -- hâlbuki o hesap hiçbir şey okuyamıyor. İfade yardımcıyla hizalandı.
  if exists (
    select 1 from public.profiles as cagiran
    where cagiran.id = caller_user_id
      and (
        cagiran.must_change_password
        or (cagiran.password_expires_at is not null
            and cagiran.password_expires_at <= now())
      )
  ) then
    raise exception 'caller must change password first' using errcode = '42501';
  end if;

  -- 🔴 B3. HEDEFİN kilidi. Menü süzgeci görünen kısım; asıl kapı burası,
  -- çünkü `switch-account` doğrudan çağrılabilir. Kilitli bir hesaba açılan
  -- oturum hiçbir şey okuyamaz — o oturumu açmak, kullanıcıyı çıkışı olmayan
  -- bir yere göndermek olur (K-22).
  if exists (
    select 1 from public.profiles as hedef
    where hedef.id = target_user_id
      and (
        hedef.must_change_password
        or (hedef.password_expires_at is not null
            and hedef.password_expires_at <= now())
      )
  ) then
    raise exception 'target must change password first' using errcode = '42501';
  end if;

  -- **Asıl kapı.** İki hesap aynı kişi kaydına bağlı olmak zorunda. `person_id`
  -- NULL ise eşleşme olmaz: `NULL = NULL` bir satır döndürmez.
  if not exists (
    select 1
    from public.profiles as cagiran
    join public.profiles as hedef
      on hedef.person_id = cagiran.person_id
    where cagiran.id = caller_user_id
      and hedef.id = target_user_id
  ) then
    raise exception 'accounts are not linked' using errcode = '42501';
  end if;

  select uyelik.organization_id, uyelik.branch_id
    into hedef_kurum
    from public.organization_memberships as uyelik
   where uyelik.user_id = target_user_id
     and uyelik.status = 'active'
   limit 1;

  if not found then
    raise exception 'target account has no active membership'
      using errcode = '42501';
  end if;

  select kullanici.email into hedef_eposta
    from auth.users as kullanici
   where kullanici.id = target_user_id;

  if hedef_eposta is null then
    raise exception 'target account has no login address'
      using errcode = '23503';
  end if;

  insert into public.audit_events (
    organization_id, branch_id, actor_user_id,
    action, entity_type, entity_id, metadata
  )
  values (
    hedef_kurum.organization_id,
    hedef_kurum.branch_id,
    caller_user_id,
    'person.account_switched',
    'profile',
    target_user_id,
    jsonb_build_object('from_user_id', caller_user_id)
  );

  return hedef_eposta;
end;
$$;
