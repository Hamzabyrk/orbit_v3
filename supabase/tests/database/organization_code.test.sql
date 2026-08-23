-- Issue #37 — Kurum kodunun doğrulanması.
--
-- Kod, giriş numarasının ilk dört hanesidir. Aralık, benzersizlik ve otomatik
-- atama garantileri kırılırsa üretilen giriş numaraları çakışır veya baştan
-- sıfırlı hale gelir; ikisi de sahada giriş yapılamaması demektir.

begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

-- Kolon eklendiğinde var olan kurumlar da kod almış olmalı.
select is(
  (select count(*) from public.organizations where code is null),
  0::bigint,
  'every existing organization received a code'
);

insert into public.organizations (id, name, slug)
values
  ('77000000-0000-0000-0000-000000000007', 'Kod Testi A', 'kod-testi-a'),
  ('88000000-0000-0000-0000-000000000008', 'Kod Testi B', 'kod-testi-b');

select ok(
  (
    select code between 1000 and 9999
    from public.organizations
    where id = '77000000-0000-0000-0000-000000000007'
  ),
  'a new organization gets a code inside the 1000-9999 range'
);

-- Baştan sıfırlı bölüm oluşmamalı; numara her zaman dört hane olmalı.
select is(
  (
    select length(code::text)
    from public.organizations
    where id = '77000000-0000-0000-0000-000000000007'
  ),
  4,
  'the code is always four digits, never zero padded'
);

select isnt(
  (
    select code
    from public.organizations
    where id = '77000000-0000-0000-0000-000000000007'
  ),
  (
    select code
    from public.organizations
    where id = '88000000-0000-0000-0000-000000000008'
  ),
  'two organizations never share a code'
);

select throws_ok(
  $$insert into public.organizations (name, slug, code)
    values ('Cakisan', 'cakisan', (select code from public.organizations limit 1))$$,
  '23505',
  null,
  'a duplicate code is rejected'
);

select throws_ok(
  $$insert into public.organizations (name, slug, code)
    values ('Aralik Disi', 'aralik-disi', 999)$$,
  '23514',
  null,
  'a code below 1000 is rejected'
);

select throws_ok(
  $$insert into public.organizations (name, slug, code)
    values ('Aralik Disi Ust', 'aralik-disi-ust', 10000)$$,
  '23514',
  null,
  'a code above 9999 is rejected'
);

select * from finish();

rollback;
