-- v1.4-17 · İki hesap ancak ikisi de söylerse aynı kişidir
--
-- Hesaplar arası geçiş düğmesi v1.3-04'ten beri bekliyor ve iki kez ertelendi.
-- Ertelemenin gerekçesi her seferinde aynıydı ve bugün yeniden ölçüldü
-- (2026-09-14): üretimde **birden fazla üyeliği olan tek bir kullanıcı yok**
-- (5 üyelik, 0 çoklu). Düğme, onu görünür kılan akış olmadan yazılırsa
-- test edilemeyen bir iş olur. Bu yüzden bu dilim **önce bağı kuran akışı**
-- getiriyor.
--
-- =========================================================================
-- Tehlikeli işlem üyelik yaratmak değil, "bu iki hesap aynı kişidir" demek
-- =========================================================================
--
-- Yol haritası bu dilimi açarken "mevcut kullanıcıya ikinci üyelik açmanın
-- guard'ı nasıl gevşetilir" diye soruyordu. Ölçüm sorunun yanlış olduğunu
-- gösterdi:
--
--   1. `organization_memberships_org_user_idx` **tam** bir UNIQUE
--      (`organization_id, user_id`). Yani bir auth kullanıcısının bir kurumda
--      ikinci üyeliği **zaten** olamaz. "Rolü kadar hesap" modeli buradan
--      çıkıyor: aynı kurumda iki rol = iki auth hesabı = iki giriş numarası.
--
--   2. `internal_create_membership`'in guard'ı gevşetilseydi açılan şey
--      başka bir kurumdaki bir kullanıcıya üyelik yazmak olurdu — ve o
--      fonksiyonun gövdesi aynı işlemde `profiles`'a `display_name` VE
--      `must_change_password = true` yazıyor. Yani guard bir "ad karışır"
--      koruması değil, bir **hesap ele geçirme** korumasıdır. Yerinde kalıyor.
--
-- Geriye gerçek soru kalıyor: hesapları kim bağlar? Yanlış bağlanan bir
-- hesaba **geçiş düğmesiyle girilir**; yani bağlama, oturum açmakla eşdeğer
-- bir yetkidir.
--
-- Karar (2026-09-14, Arda Bülent): **kişinin kendisi, her iki hesaba da
-- girerek.** Kurum yöneticisi bağlayamaz — kendi kurumundaki herhangi iki
-- hesabı birleştirebilseydi, kendi hesabını bir öğretmeninkine bağlayıp onun
-- paneline geçebilirdi.
--
-- =========================================================================
-- Kişi kaydı kurum-üstüdür ve bu şemada bir ilktir
-- =========================================================================
--
-- ⚠️ `people` tablosunda **`organization_id` YOK.** Bir kişi A kurumunda
-- öğretmen, B kurumunda veli olabilir; kurum kimliği taşısaydı bu kişi iki
-- kişi olurdu ve KVKK "verilerimi sil" talebinde biri gözden kaçardı
-- (2026-08-25 kararı).
--
-- Bu, `public` şemasındaki **tek kurum-üstü iş tablosu**. Her diğer tabloda
-- `organization_id` süzgeci arayan bir okuyucu burada bulamayacak; RLS'i
-- kurumdan değil **sahiplikten** geliyor. Yazılıyor ki §4.12'nin "açık
-- `organization_id` süzgeci" kuralını burada arayan biri eksiklik sanmasın.
--
-- İkili bağ (`linked_account_id`) reddedildi: iki hesapta çalışır, **üçte
-- kırılır** — üç hesabın hangi ikisinin bağlanacağı belirsizdir (2026-08-25).

create table public.people (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.people is
  'Bir insanın hesaplarını gruplayan kayıt. Alanı YOKTUR ve olmamalıdır: ad `profiles`''ta, rol `organization_memberships`''ta durur (K-06). KURUM-ÜSTÜDÜR — `organization_id` taşımaz, çünkü bir kişi iki kurumda iki rolde olabilir. Bu şemadaki tek kurum-üstü iş tablosu.';

create trigger people_set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

alter table public.people enable row level security;

-- =========================================================================
-- Hesap → kişi bağı
-- =========================================================================
--
-- ⚠️ **`person_id` için sütun yetkisi VERİLMİYOR ve bu dilimin en önemli
-- satırı bu.** `profiles_update_self` politikası hesabın sahibine UPDATE
-- veriyor; `person_id` yazılabilir olsaydı kullanıcı kendi `person_id`'sini
-- başkasınınkiyle eşitler ve geçiş düğmesiyle o hesaba **girerdi**.
--
-- Ölçüldü (2026-09-14): `profiles` üzerindeki `authenticated` yetkileri
-- tablo geneli değil **sütun bazlı** (`display_name`, `avatar_url`, `phone`).
-- Yani yeni sütun kendiliğinden yazılabilir olmuyor. Yine de bu bir tesadüfe
-- dayanmasın diye pgTAP'ta ayrıca sabitleniyor.

alter table public.profiles
  add column person_id uuid references public.people(id) on delete set null;

comment on column public.profiles.person_id is
  'Bu hesabın ait olduğu kişi. NULL = henüz hiçbir hesaba bağlanmamış (bugün herkes böyle). `authenticated` bu sütuna YAZAMAZ: yazabilseydi kullanıcı kendini başkasının kişi kaydına ekleyip geçiş düğmesiyle o hesaba girerdi. Yalnız `link_accounts` yazar.';

create index profiles_person_idx
  on public.profiles (person_id)
  where person_id is not null;

-- Kişi kaydını yalnız o kişi görür. Politika `profiles`'ı okuyor ve
-- `profiles_select_self` zaten yalnız kendi satırını veriyor — yani bu
-- politika `security definer` bir yardımcıya ihtiyaç duymadan kapanıyor.
--
-- ⚠️ Politika sütun eklendikten SONRA kuruluyor: `people`'ın yanında
-- yazılmıştı ve `ben.person_id does not exist` ile düştü. Sıra rastgele değil.
-- ⚠️ Şifre kilidi koşulu (`current_user_must_change_password`) ilk yazımda
-- YOKTU ve `password_lock_boundary` kapısı yakaladı: kilidi atlayan politika
-- sayısı altıdan yediye çıkmıştı. O kapının cümlesi "atlayan her politika bir
-- kimlik okumasıdır" diyor; kişi kaydı o listeye ait değil.
create policy people_select_self on public.people
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles as ben
      where ben.id = (select auth.uid())
        and ben.person_id = people.id
    )
    and not (select public.current_user_must_change_password())
  );

-- =========================================================================
-- Bağlama kodu
-- =========================================================================
--
-- Kod **hash'lenmiş** saklanıyor: tabloyu okuyabilen biri (bugün kimse, ama
-- yedekler ve gelecekteki bir hata payı var) kodu geri üretemesin.
--
-- ⚠️ Kod uzunluğu bir güvenlik kararı, bir okunabilirlik tercihi değil.
-- Kodu bilen kişi iki hesabı bağlayabiliyor ve bağlanan hesaba **geçiş
-- düğmesiyle giriliyor** — yani kod, bir oturum açma sırrıyla aynı ağırlıkta.
-- 6 haneli bir kod 10 dakikalık pencerede kaba kuvvetle denenebilirdi.
-- 12 onaltılık karakter ≈ 2,8 × 10^14 olasılık; aynı pencerede anlamsız.
--
-- `gen_random_uuid()` PostgreSQL'in güçlü rastgelelik kaynağını kullanıyor;
-- ayrıca bir eklenti (pgcrypto) gerektirmiyor.

create table public.account_link_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  issuer_user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.account_link_codes is
  'Hesap bağlama kodları. Kod HASH''lenmiş durur; ham hâli yalnız üretildiği anda çağırana döner ve bir daha okunamaz. Tek kullanımlık ve 10 dakikalık. Bu tabloyu hiçbir politika okutmaz: yalnız `security definer` fonksiyonlar dokunur (`internal_function_calls` ile aynı kalıp).';

create index account_link_codes_issuer_idx
  on public.account_link_codes (issuer_user_id, created_at desc);

-- RLS açık, politika YOK — bilinçli. Bu tabloya yalnız aşağıdaki iki
-- `security definer` fonksiyon dokunuyor; doğrudan okunacak ya da yazılacak
-- bir satırı yok. Aynı kalıp `internal_function_calls` ve
-- `workspace_documents`'ta da var ve advisor bunu INFO olarak sayar.
alter table public.account_link_codes enable row level security;

-- =========================================================================
-- Kardeş hesapları görebilmek
-- =========================================================================
--
-- `profiles_select_self` yalnız kendi satırını veriyor (ölçüldü). Geçiş
-- düğmesi diğer hesabın **adını** göstermek zorunda, yani yeni bir okuma
-- yolu gerekiyor — ve bu yol `security definer` olmak zorunda: başkasının
-- `profiles` satırına bakmak tam olarak RLS'in yasakladığı şey.
--
-- Yolun dar olduğunu pgTAP iki olumsuz senaryoyla sınıyor: bağlı OLMAYAN bir
-- hesabın profili görünmüyor, ve kişi kaydı **olmayan** iki hesap birbirini
-- göremiyor.
--
-- ⚠️ İkincisi bugün herkesin durumu (`person_id` her satırda NULL) ve gövdede
-- ayrıca bir `ben.person_id is not null` koşuluyla korunuyordu. Mutasyon
-- turunda o koşul kaldırıldı ve **hiçbir test kırmızıya dönmedi** (**K-23**):
-- `digeri.person_id = ben.person_id` karşılaştırması, `ben.person_id` NULL
-- iken hiçbir satır eşleştirmiyor — SQL'in üç değerli mantığı işi zaten
-- yapıyor. Ölü koşul kaldırıldı (**K-06**) ve yerine davranışı sabitleyen bir
-- iddia yazıldı: koruma artık gövdedeki bir cümlede değil, **testte** duruyor.

create or replace function public.current_user_shares_person(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as ben
    join public.profiles as digeri
      on digeri.person_id = ben.person_id
    where ben.id = (select auth.uid())
      and digeri.id = target_user_id
  );
$$;

comment on function public.current_user_shares_person(uuid) is
  'Hedef hesap, çağıranla AYNI kişi kaydına mı bağlı? Kişi kaydı olmayan (person_id NULL) çağıran için her zaman false — yani bugün herkes için false. `security definer`: başkasının `profiles` satırına bakmak RLS''in yasakladığı şeydir.';

create policy profiles_select_linked_account on public.profiles
  for select to authenticated
  using (
    public.current_user_shares_person(id)
    and not (select public.current_user_must_change_password())
  );

-- =========================================================================
-- Kodun üretilmesi
-- =========================================================================
--
-- Bir kişinin aynı anda **tek** canlı kodu olur: yeni kod üretmek eskisini
-- tüketilmiş saymaz, **siler**. Sebep basit — ekranda tek kod gösteriliyor ve
-- kullanıcı "yenile"ye bastığında eskisinin hâlâ geçerli olduğunu bilmiyor.
-- Bilinmeyen bir sırrın açık kalması, kullanıcının göremediği bir risktir.

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

  delete from public.account_link_codes as eski
   where eski.issuer_user_id = benim_kimligim;

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
  'Çağıran hesap için tek kullanımlık bir bağlama kodu üretir ve HAM hâlini döner — bir daha okunamaz. Aynı hesabın önceki kodları SİLİNİR: ekranda tek kod görünüyor, kullanıcının bilmediği bir sır açık kalmamalı. Üyeliği olmayan hesap kod üretemez (ORB03).';

-- =========================================================================
-- Bağın kurulması
-- =========================================================================
--
-- Dört ret ve her birinin ayrı bir sebebi var; `detail` makine tarafında
-- ayırt edilsin diye etiket taşıyor, `message` ise kullanıcıya gösterilecek
-- cümle (bu depoda ölçülmüş bölüşüm: kısıt adı `message`''ta, bizim
-- yazdığımız şey `detail`''da).
--
-- ⚠️ **`must_change_password` koşulu bir güvenlik kararıdır.** Yönetici üyeyi
-- kâğıt fişteki geçici şifreyle yaratıyor ve `internal_create_membership` o
-- şifreyi `must_change_password = true` ile kilitliyor. O kilit
-- kaldırılmadan hesabın "sahibi" kim olduğu belirsizdir — geçici şifreyi
-- bilen yönetici de olabilir. Kilidi kaldıran tek şey kişinin kendi şifresini
-- belirlemesidir; bağlama ancak ondan sonra bir sahiplik kanıtıdır.

create or replace function public.link_accounts(link_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  benim_kimligim uuid := (select auth.uid());
  kayit public.account_link_codes;
  kisi_id uuid;
  kurum record;
begin
  if benim_kimligim is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.profiles as ben
    where ben.id = benim_kimligim and ben.must_change_password
  ) then
    raise exception 'Hesabı bağlamadan önce geçici şifrenizi değiştirin.'
      using errcode = 'ORB03',
            detail = 'password_not_taken_over';
  end if;

  select * into kayit
    from public.account_link_codes as kod
   where kod.code_hash = encode(sha256(convert_to(link_code, 'utf8')), 'hex')
   for update;

  if not found then
    raise exception 'Bağlama kodu geçersiz.'
      using errcode = 'ORB03', detail = 'code_unknown';
  end if;

  if kayit.consumed_at is not null then
    raise exception 'Bu bağlama kodu zaten kullanılmış.'
      using errcode = 'ORB03', detail = 'code_consumed';
  end if;

  if kayit.expires_at <= now() then
    raise exception 'Bağlama kodunun süresi dolmuş.'
      using errcode = 'ORB03', detail = 'code_expired';
  end if;

  if kayit.issuer_user_id = benim_kimligim then
    raise exception 'Bir hesabı kendisine bağlayamazsınız.'
      using errcode = 'ORB03', detail = 'self_link';
  end if;

  if not exists (
    select 1
    from public.organization_memberships as uyelik
    where uyelik.user_id = benim_kimligim
      and uyelik.status = 'active'
  ) then
    raise exception 'Bu hesabın aktif bir üyeliği yok.'
      using errcode = 'ORB03', detail = 'consumer_without_membership';
  end if;

  -- Kodu üreten hesabın kişi kaydı yoksa şimdi açılıyor.
  select ben.person_id into kisi_id
    from public.profiles as ben
   where ben.id = kayit.issuer_user_id;

  if kisi_id is null then
    insert into public.people default values returning id into kisi_id;

    update public.profiles
       set person_id = kisi_id
     where id = kayit.issuer_user_id;
  end if;

  -- ⚠️ Bağlanan hesap BAŞKA bir kişiye aitse birleştirme YAPILMIYOR.
  -- İki kişi kaydını birleştirmek, iki insanın hesaplarını tek gruba
  -- toplama riskini taşır ve geri alınması zordur. Bugün böyle bir ihtiyaç
  -- yok; olduğunda ayrı bir karar olarak açılır (**K-04**).
  if exists (
    select 1 from public.profiles as ben
    where ben.id = benim_kimligim
      and ben.person_id is not null
      and ben.person_id <> kisi_id
  ) then
    raise exception 'Bu hesap başka bir kişi kaydına bağlı.'
      using errcode = 'ORB04', detail = 'already_linked_elsewhere';
  end if;

  update public.profiles
     set person_id = kisi_id
   where id = benim_kimligim;

  update public.account_link_codes
     set consumed_at = now(),
         consumed_by_user_id = benim_kimligim
   where id = kayit.id;

  -- İz, ilgili HER kuruma ayrı ayrı yazılıyor. İki hesap iki farklı kurumda
  -- olabilir ve iki kurumun yöneticisi de kendi kurumundaki hesabın
  -- bağlandığını görebilmeli. Aynı kurumdaysa tek satır düşer.
  for kurum in
    select distinct uyelik.organization_id, uyelik.branch_id
      from public.organization_memberships as uyelik
     where uyelik.user_id in (benim_kimligim, kayit.issuer_user_id)
       and uyelik.status = 'active'
  loop
    insert into public.audit_events (
      organization_id, branch_id, actor_user_id,
      action, entity_type, entity_id, metadata
    )
    values (
      kurum.organization_id,
      kurum.branch_id,
      benim_kimligim,
      'person.accounts_linked',
      'person',
      kisi_id,
      jsonb_build_object('linked_user_id', kayit.issuer_user_id)
    );
  end loop;

  return kisi_id;
end;
$$;

comment on function public.link_accounts(text) is
  'Bağlama kodunu tüketir ve iki hesabı aynı kişi kaydına bağlar. İKİ TARAFLI KANITTIR: kodu üreten hesaba da, tüketen hesaba da girebilmek gerekir — bu yüzden kurum yöneticisi başkasının hesabını kendi kontrolündeki bir kişiye bağlayamaz. Geçici şifresini değiştirmemiş hesap bağlanamaz (ORB03 / password_not_taken_over): o kilit kalkmadan hesabın sahibi belirsizdir. Zaten BAŞKA bir kişiye bağlı hesap için kişi kayıtları BİRLEŞTİRİLMEZ (ORB04). İz, ilgili her kuruma ayrı yazılır.';

-- =========================================================================
-- Yetki — önce revoke, sonra grant
-- =========================================================================
--
-- Ev kuralı (2026-09-09) ve geçen dilimde yine işe yaradı: PostgreSQL yeni
-- fonksiyona `public` rolü üzerinden EXECUTE veriyor, `grant ... to
-- authenticated` onu daraltmıyor.

revoke all on function public.current_user_shares_person(uuid) from public, anon;
revoke all on function public.issue_account_link_code() from public, anon;
revoke all on function public.link_accounts(text) from public, anon;

grant execute on function public.current_user_shares_person(uuid) to authenticated;
grant execute on function public.issue_account_link_code() to authenticated;
grant execute on function public.link_accounts(text) to authenticated;

-- `people` yalnız okunur; yazma işini yukarıdaki `security definer` fonksiyon
-- yapıyor. `account_link_codes`''a hiçbir yetki verilmiyor.
-- ⚠️ **Tablo yetkileri önce SIFIRLANIYOR** ve bu deponun yazılı tuzaklarından
-- biri: `public` şemasındaki varsayılan yetkiler yeni tabloyu `authenticated`
-- için **yazılabilir doğuruyor**. RLS onu engelliyor ama yetki yanlış kalıyor
-- ve `every_write_leaves_a_trace` kapısı ikisini de yakaladı (`people`,
-- `account_link_codes`). Kapı haklı: "RLS zaten engelliyor" bir yetki
-- hatasının gerekçesi değildir — bir gün politika değişir, yetki kalır.
revoke all on public.people from anon, authenticated;
revoke all on public.account_link_codes from anon, authenticated;

grant select (id, created_at, updated_at) on public.people to authenticated;

-- ⚠️ `profiles.person_id` için **hiçbir yetki verilmiyor** — sebebi yukarıda.
grant select (person_id) on public.profiles to authenticated;
