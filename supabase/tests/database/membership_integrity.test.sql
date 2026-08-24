-- Issue #65 — Üyelik bütünlüğü ve operatör istatistikleri.
--
-- En kritik test çift üyeliği reddedeni: bir kişinin bir kurumda iki üyeliği
-- olursa iki `person_code` alır, iki giriş numarası doğar ve bunlardan yalnızca
-- biri gerçek bir auth hesabına karşılık gelir. Diğer numara sessizce
-- çalışmaz — kullanıcı "şifrem yanlış" sanır, oysa hesabı hiç yoktur.

begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '50001000@orbit.invalid', '', now(), now()),
  ('e2000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'operator-e@example.test', '', now(), now()),
  ('e3000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', '50011000@orbit.invalid', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('e2000000-0000-0000-0000-000000000002', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values
  ('f1000000-0000-0000-0000-000000000001', 'Kurum G', 'kurum-g', 5000),
  ('f2000000-0000-0000-0000-000000000002', 'Kurum H', 'kurum-h', 5001);

insert into public.branches (id, organization_id, name, is_default)
values
  ('f1100000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000001', 'Merkez', true),
  ('f1200000-0000-0000-0000-000000000002',
   'f1000000-0000-0000-0000-000000000001', 'İkinci Şube', false);

insert into public.organization_memberships
  (organization_id, branch_id, user_id, role, status, person_code)
values (
  'f1000000-0000-0000-0000-000000000001', null,
  'e1000000-0000-0000-0000-000000000001', 'admin', 'active', 1000
);

-- Üyelik bütünlüğü ---------------------------------------------------------

select has_index(
  'public', 'organization_memberships', 'organization_memberships_org_user_idx',
  'the one-membership-per-person index exists'
);

select hasnt_index(
  'public', 'organization_memberships',
  'organization_memberships_org_wide_user_idx',
  'the old partial org-wide index is gone'
);

select hasnt_index(
  'public', 'organization_memberships',
  'organization_memberships_branch_user_idx',
  'the old partial branch-scoped index is gone'
);

-- 🔴 En kritik iddia. Kırılırsa kişi iki numara alır ve biri hiçbir hesaba
-- karşılık gelmez.
select throws_ok(
  $$insert into public.organization_memberships
      (organization_id, branch_id, user_id, role, status, person_code)
    values ('f1000000-0000-0000-0000-000000000001',
            'f1100000-0000-0000-0000-000000000001',
            'e1000000-0000-0000-0000-000000000001', 'teacher', 'active', 1001)$$,
  '23505',
  null,
  'a second membership in the same organization is rejected'
);

-- Farklı şube de olsa fark etmez: kısıt şubeye değil kuruma bakıyor.
select throws_ok(
  $$insert into public.organization_memberships
      (organization_id, branch_id, user_id, role, status, person_code)
    values ('f1000000-0000-0000-0000-000000000001',
            'f1200000-0000-0000-0000-000000000002',
            'e1000000-0000-0000-0000-000000000001', 'teacher', 'active', 1002)$$,
  '23505',
  null,
  'a second membership is rejected even in a different branch'
);

-- Farklı kurumda üyelik şema düzeyinde serbesttir. Ürün kararı gereği bir
-- hesap tek kuruma aittir, ancak bu kısıt kimlik katmanında uygulanır; şema
-- ileride model değişirse yolu kapatmaz.
select lives_ok(
  $$insert into public.organization_memberships
      (organization_id, user_id, role, status, person_code)
    values ('f2000000-0000-0000-0000-000000000002',
            'e3000000-0000-0000-0000-000000000003', 'admin', 'active', 1000)$$,
  'a membership in a different organization is allowed'
);

-- İstatistik fonksiyonu ----------------------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'e2000000-0000-0000-0000-000000000002', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is(
  (public.platform_organization_stats(
     'f1000000-0000-0000-0000-000000000001') ->> 'member_count')::integer,
  1,
  'an operator can read the member count'
);

select is(
  (public.platform_organization_stats(
     'f1000000-0000-0000-0000-000000000001') ->> 'branch_count')::integer,
  2,
  'an operator can read the branch count'
);

-- Sayı görünüyor ama kişiler görünmüyor: "operatör kapları yönetir, içeriği
-- görmez" taahhüdü sayıyla değil kişisel veriyle ilgilidir.
select is(
  (select count(*) from public.organization_memberships),
  0::bigint,
  'the operator still cannot read any membership row'
);

reset role;

-- Kurum kullanıcısı istatistik göremez ---------------------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', 'e1000000-0000-0000-0000-000000000001', true
);
select set_config('request.jwt.claim.role', 'authenticated', true);

-- Fonksiyon SECURITY DEFINER; yetkiyi kendi içinde denetliyor. Operatör
-- olmayan çağırana veri değil `null` dönmeli.
select is(
  public.platform_organization_stats('f1000000-0000-0000-0000-000000000001'),
  null,
  'a non-operator gets null instead of statistics'
);

reset role;

set local role anon;

select throws_ok(
  $$select public.platform_organization_stats(
      'f1000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'anon cannot execute the statistics function at all'
);

reset role;

select * from finish();

rollback;
