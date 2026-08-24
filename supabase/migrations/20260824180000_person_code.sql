-- Issue #53 — Giriş numarasının ikinci yarısı.
--
-- Giriş numarası `<kurum:4><kişi:4>` biçiminde ve sentetik adresin
-- (`<numara>@orbit.invalid`) tamamını oluşturuyor. Kurum yarısı
-- `organizations.code` olarak zaten var; bu migration kişi yarısını ekliyor.
--
-- Kolon `profiles`'a DEĞİL `organization_memberships`'e konuyor. `profiles`'a
-- konsaydı ya tam numarayı (kurum kodu dahil) saklardık — kurum kodunu ikinci
-- kez saklamak, bu projede yedi kez soruna yol açmış drift kalıbıdır — ya da
-- kişi kodunu kurumdan bağımsız saklardık ve iki kurumda aynı kodun çakışması
-- engellenemezdi. Üyelik kaydı zaten kurum başına birdir; kod oraya aittir.
--
-- Bkz. `.ai/PROJECT_STATE.md` bölüm 10 şema tablosu ve
-- `.ai/DECISION_LOG.md` — "Bir giriş hesabı tek kuruma aittir".

alter table public.organization_memberships
  add column person_code integer;

comment on column public.organization_memberships.person_code is
  'Giriş numarasının ikinci dört hanesi. Kurum içinde benzersizdir; kurum kodu ile birleşince global olarak benzersiz olur.';

-- Kurum kodunda olduğu gibi 1000''den başlar: baştaki sıfır hiç oluşmaz ve
-- kullanıcı `0042`''yi `42` diye yazıp giriş yapamaz duruma düşmez.
alter table public.organization_memberships
  add constraint organization_memberships_person_code_range
  check (person_code is null or person_code between 1000 and 9999);

-- Benzersizlik kurum içindedir. İki farklı kurumun 1000'inci kişisi olabilir;
-- numaraları farklıdır çünkü kurum kodları farklıdır.
create unique index organization_memberships_org_person_code_idx
  on public.organization_memberships (organization_id, person_code)
  where person_code is not null;

-- Kolon nullable: bu migration uygulandığında var olan üyelik kayıtlarının
-- kodu yoktur ve onlara geriye dönük kod atamıyoruz. O kayıtlar Faz E2'de test
-- kurumuyla birlikte siliniyor. Yeni kayıtların kodsuz kalmaması, kodu üreten
-- tek yol olan `internal_bootstrap_organization` ile güvence altındadır.

-- Sıradaki kişi kodunu üretir.
--
-- Sequence kullanılamaz: sequence global olarak artar, oysa her kurum kendi
-- 1000'inden başlamalı. Kurum başına ayrı sequence yaratmak ise kurum sayısı
-- kadar veritabanı nesnesi demek olurdu.
--
-- Yarış koşulu, kurum satırı kilitlenerek engelleniyor. İki eşzamanlı kullanıcı
-- oluşturma isteği aynı kurumda aynı kodu alamaz; ikincisi birincinin
-- bitmesini bekler. Kilit olmasaydı `max(person_code) + 1` ikisinde de aynı
-- değeri döndürürdü ve yukarıdaki benzersiz indeks isteklerden birini
-- reddederdi — kullanıcıya sebepsiz bir hata olarak görünürdü.
create or replace function public.internal_next_person_code(
  target_organization_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_code integer;
begin
  perform 1
  from public.organizations
  where id = target_organization_id
  for update;

  if not found then
    raise exception 'organization does not exist' using errcode = '23503';
  end if;

  select coalesce(max(membership.person_code), 999) + 1
  into next_code
  from public.organization_memberships as membership
  where membership.organization_id = target_organization_id;

  if next_code > 9999 then
    raise exception 'organization person code capacity exhausted'
      using errcode = '23514';
  end if;

  return next_code;
end;
$$;

-- Kurum kodunu kullanıcı oluşturulmadan ÖNCE ayırır.
--
-- Sıra sorunu: sentetik adres `<kurum kodu><kişi kodu>@orbit.invalid` olduğu
-- için auth kullanıcısını yaratmadan önce kurum kodunu bilmemiz gerekiyor.
-- Ama kurum kaydı, üyeliğin bağlanacağı auth kullanıcısı olmadan tamamlanmıyor.
-- Bu fonksiyon düğümü çözüyor: kod önce ayrılır, sonra kullanıcı yaratılır,
-- en son kurum bu kodla oluşturulur.
--
-- Ayrılan kod kullanılmazsa sequence'te boşluk kalır. Bu kabul edilebilir:
-- kodlar sıralı olmak zorunda değil, yalnızca benzersiz olmak zorunda.
create or replace function public.internal_reserve_organization_code()
returns integer
language sql
security definer
set search_path = ''
as $$
  select nextval('public.organization_code_seq')::integer;
$$;

-- İstemciden çağrılamazlar. Kişi kodu üretimi ve kod ayırma yalnızca
-- `service_role` ile çalışan Edge Function üzerinden yapılır; aksi halde bir
-- kullanıcı kurumun numara alanını tüketebilir veya kendine kod üretebilirdi.
--
-- Supabase her fonksiyona `anon` ve `authenticated` için ayrı bir default
-- EXECUTE grant'ı verir; `from public` revoke'u bunları kaldırmaz. Issue #18'de
-- tam olarak bu kaçırılmıştı.
revoke all on function public.internal_next_person_code(uuid)
  from public, anon, authenticated;
revoke all on function public.internal_reserve_organization_code()
  from public, anon, authenticated;

grant execute on function public.internal_next_person_code(uuid) to service_role;
grant execute on function public.internal_reserve_organization_code() to service_role;
