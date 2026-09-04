-- v1.2-01 — Öğrenci ve veli kayıtlarının sınırları.
--
-- Bu testlerin çoğu **olumsuz**: bir rolün ne göremediğini ve ne yazamadığını
-- kanıtlıyorlar. Sebebi şu: fazla açık yazılmış bir politika, olumlu testlerin
-- hepsini geçer. "Yönetici kendi öğrencisini görüyor mu" sorusu, politikanın
-- yanlışlıkla bütün kurumların öğrencilerini açtığı bir dünyada da "evet" der.
--
-- Üç test ayrıca bu dilimin dayandığı varsayımları kanıtlıyor:
--   * Bileşik FK, öğrenciyi başka kurumun şubesine bağlatmıyor — tenant sınırı
--     RLS'ten bağımsız olarak veri düzeyinde de duruyor.
--   * #150'nin içerik koruması `students` ve `guardians`'ı **kimse ona bir şey
--     yazmadan** görüyor; dilimin `organization_id` varsayımının karşılığı.
--   * Zorunlu şifre değişimi kilidi artık sunucuda; kilitli yönetici ne
--     okuyabiliyor ne yazabiliyor.

begin;

create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('a1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'sube-yoneticisi@example.test', '', now(), now()),
  ('a2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kurum-yoneticisi@example.test', '', now(), now()),
  ('a3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('a4000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogrenci@example.test', '', now(), now()),
  ('a5000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'veli@example.test', '', now(), now()),
  ('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'diger-kurum-yoneticisi@example.test', '', now(), now()),
  ('0f000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'platform-operatoru@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('0f000000-0000-0000-0000-00000000000f', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'Kurum A', 'kurum-a-v12', 7001),
  ('bb000000-0000-0000-0000-0000000000bb', 'Kurum B', 'kurum-b-v12', 7002);

insert into public.branches (id, organization_id, name, is_default)
values
  ('a1100000-0000-0000-0000-0000000011a1', 'aa000000-0000-0000-0000-0000000000aa', 'A Merkez', true),
  ('a2200000-0000-0000-0000-0000000022a2', 'aa000000-0000-0000-0000-0000000000aa', 'A İkinci Şube', false),
  ('b1100000-0000-0000-0000-0000000011b1', 'bb000000-0000-0000-0000-0000000000bb', 'B Merkez', true);

-- Şube yöneticisinin `branch_id`'si dolu, kurum yöneticisininki NULL. Fark
-- testlerin konusu: ilki yalnızca kendi şubesini görmeli.
insert into public.organization_memberships
  (organization_id, branch_id, user_id, role, status, person_code)
values
  ('aa000000-0000-0000-0000-0000000000aa', 'a1100000-0000-0000-0000-0000000011a1',
   'a1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000),
  ('aa000000-0000-0000-0000-0000000000aa', null,
   'a2000000-0000-0000-0000-000000000002', 'admin', 'active', 1001),
  ('aa000000-0000-0000-0000-0000000000aa', 'a1100000-0000-0000-0000-0000000011a1',
   'a3000000-0000-0000-0000-000000000003', 'teacher', 'active', 1002),
  ('aa000000-0000-0000-0000-0000000000aa', 'a1100000-0000-0000-0000-0000000011a1',
   'a4000000-0000-0000-0000-000000000004', 'student', 'active', 1003),
  ('aa000000-0000-0000-0000-0000000000aa', 'a1100000-0000-0000-0000-0000000011a1',
   'a5000000-0000-0000-0000-000000000005', 'parent', 'active', 1004),
  ('bb000000-0000-0000-0000-0000000000bb', 'b1100000-0000-0000-0000-0000000011b1',
   'b1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000);

insert into public.students (id, organization_id, branch_id, auth_user_id, full_name)
values
  ('50000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-0000000000aa',
   'a1100000-0000-0000-0000-0000000011a1', 'a4000000-0000-0000-0000-000000000004',
   'Hesabı Olan Öğrenci'),
  ('50000000-0000-0000-0000-000000000002', 'aa000000-0000-0000-0000-0000000000aa',
   'a2200000-0000-0000-0000-0000000022a2', null,
   'İkinci Şubedeki Öğrenci'),
  ('50000000-0000-0000-0000-000000000003', 'bb000000-0000-0000-0000-0000000000bb',
   'b1100000-0000-0000-0000-0000000011b1', null,
   'Diğer Kurumun Öğrencisi');

insert into public.guardians (id, organization_id, auth_user_id, full_name)
values
  ('60000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-0000000000aa',
   'a5000000-0000-0000-0000-000000000005', 'Hesabı Olan Veli'),
  ('60000000-0000-0000-0000-000000000002', 'bb000000-0000-0000-0000-0000000000bb',
   null, 'Diğer Kurumun Velisi');

-- Veri düzeyi: RLS'ten bağımsız duran sınırlar --------------------------------

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'b1100000-0000-0000-0000-0000000011b1',
      'Yanlış Şubeye Bağlanan'
    )$sql$,
  '23503',
  null,
  'a student cannot be attached to another organization branch'
);

select throws_ok(
  $sql$insert into public.students (organization_id, full_name, auth_user_id)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'İkinci Kayıt',
      'a4000000-0000-0000-0000-000000000004'
    )$sql$,
  '23505',
  null,
  'one login account cannot back two student records'
);

-- #150 içerik koruması: kimse listeye bir şey eklemeden iki yeni tabloyu da
-- görmeli. Dilimin `organization_id` varsayımının bedelinin ödendiği yer.
select throws_ok(
  $sql$select public.internal_delete_organization(
      'aa000000-0000-0000-0000-0000000000aa',
      '0f000000-0000-0000-0000-00000000000f'
    )$sql$,
  'ORB01',
  'organization still holds content',
  'an organization holding students cannot be deleted'
);

create function pg_temp.silmeyi_dene(org uuid, actor uuid)
returns text
language plpgsql
as $fn$
declare
  gerekce text;
begin
  perform public.internal_delete_organization(org, actor);
  return null;
exception when sqlstate 'ORB01' then
  get stacked diagnostics gerekce = pg_exception_detail;
  return gerekce;
end;
$fn$;

select is(
  pg_temp.silmeyi_dene(
    'aa000000-0000-0000-0000-0000000000aa',
    '0f000000-0000-0000-0000-00000000000f'
  )::jsonb,
  '[{"table": "guardians", "rows": 1}, {"table": "students", "rows": 2}]'::jsonb,
  'the refusal names both new tables and their row counts'
);

-- Şube yöneticisi ------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a1000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (select count(*) from public.students),
  1::bigint,
  'a branch-bound admin sees only students in their own branch'
);

-- Kurum yöneticisi -----------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);

select is(
  (select count(*) from public.students),
  2::bigint,
  'an organization-wide admin sees every branch in their organization'
);

select is(
  (select count(*) from public.students
     where organization_id = 'bb000000-0000-0000-0000-0000000000bb'),
  0::bigint,
  'an admin cannot see another organization students'
);

select is(
  (select count(*) from public.guardians),
  1::bigint,
  'an admin sees only their own organization guardians'
);

select lives_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'a1100000-0000-0000-0000-0000000011a1',
      'Yeni Kayıt'
    )$sql$,
  'an admin can enroll a student in their own organization'
);

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name)
    values (
      'bb000000-0000-0000-0000-0000000000bb',
      'b1100000-0000-0000-0000-0000000011b1',
      'Sızdırılan Kayıt'
    )$sql$,
  '42501',
  null,
  'an admin cannot enroll a student into another organization'
);

select lives_ok(
  $sql$update public.students set full_name = 'Düzeltilmiş Ad'
      where id = '50000000-0000-0000-0000-000000000001'$sql$,
  'an admin can correct a student name'
);

-- Sütun yetkisi verilmediği için RLS'e hiç sıra gelmiyor: öğrenciyi başka
-- kuruma taşımak bir güncelleme değil, tenant sınırını geçmektir.
select throws_ok(
  $sql$update public.students
      set organization_id = 'bb000000-0000-0000-0000-0000000000bb'
      where id = '50000000-0000-0000-0000-000000000001'$sql$,
  '42501',
  null,
  'an admin cannot move a student to another organization'
);

-- Hesap bağlamak bir kimlik işlemi; yönetici bunu doğrudan yazamaz.
select throws_ok(
  $sql$update public.students
      set auth_user_id = 'a3000000-0000-0000-0000-000000000003'
      where id = '50000000-0000-0000-0000-000000000002'$sql$,
  '42501',
  null,
  'an admin cannot attach a login account by writing the column'
);

select throws_ok(
  $sql$delete from public.students
      where id = '50000000-0000-0000-0000-000000000001'$sql$,
  '42501',
  null,
  'nobody deletes a student record through the API'
);

-- Öğretmen ve veli — bu dilimde kapsamları yok --------------------------------

select set_config('request.jwt.claim.sub', 'a3000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*) from public.students),
  0::bigint,
  'a teacher sees no students until class assignments exist (v1.2-02)'
);

select set_config('request.jwt.claim.sub', 'a5000000-0000-0000-0000-000000000005', true);

select is(
  (select count(*) from public.students),
  0::bigint,
  'a parent sees no students until the guardian link exists (v1.2-03)'
);

select is(
  (select count(*) from public.guardians),
  1::bigint,
  'a parent still sees their own guardian record'
);

-- Öğrenci ---------------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'a4000000-0000-0000-0000-000000000004', true);

select is(
  (select count(*) from public.students),
  1::bigint,
  'a student sees exactly one record'
);

select is(
  (select id from public.students),
  '50000000-0000-0000-0000-000000000001'::uuid,
  'the record a student sees is their own'
);

-- Zorunlu şifre değişimi kilidi ------------------------------------------------

reset role;
update public.profiles
set must_change_password = true
where id = 'a2000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a2000000-0000-0000-0000-000000000002', true);

select is(
  (select count(*) from public.students),
  0::bigint,
  'an admin who must change their password reads nothing'
);

select throws_ok(
  $sql$insert into public.students (organization_id, branch_id, full_name)
    values (
      'aa000000-0000-0000-0000-0000000000aa',
      'a1100000-0000-0000-0000-0000000011a1',
      'Kilitliyken Yazılan'
    )$sql$,
  '42501',
  null,
  'an admin who must change their password writes nothing'
);

-- anon --------------------------------------------------------------------------

reset role;
set local role anon;

select throws_ok(
  $sql$select * from public.students$sql$,
  '42501',
  null,
  'anon cannot read student records'
);

select throws_ok(
  $sql$select * from public.guardians$sql$,
  '42501',
  null,
  'anon cannot read guardian records'
);

select * from finish();
rollback;
