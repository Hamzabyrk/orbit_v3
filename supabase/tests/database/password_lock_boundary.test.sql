-- v1.2-11 — Kilidin sınırı: kimlik açık, iş verisi kapalı.
--
-- Bu dosya iki şeyi birden kanıtlamak zorunda ve ikisi de aynı anda doğru
-- olmalı:
--
--   * **Kilitli kullanıcı kendini hâlâ tanıtabiliyor.** Profilini, üyeliğini,
--     kurumunu ve şubesini okuyabiliyor — yoksa kilitli olduğunu öğrenemez ve
--     kilitten çıkamaz.
--   * **Kilitli kullanıcı iş verisine ulaşamıyor.** Denetim kaydı,
--     başkalarının profilleri, başkalarının üyelikleri kapalı.
--
-- Yalnızca ikincisini ölçmek yanıltıcı olurdu: her şeyi kilitleyen bir
-- migration da o testleri geçer ve kullanıcıyı sistemden tamamen dışlar.

begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, created_at, updated_at
)
values
  ('c1100000-0000-0000-0000-0000000c1100', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kilitli-yonetici@example.test', '', now(), now()),
  ('c2200000-0000-0000-0000-0000000c2200', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'acik-yonetici@example.test', '', now(), now()),
  ('c3300000-0000-0000-0000-0000000c3300', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ogretmen@example.test', '', now(), now()),
  ('c4400000-0000-0000-0000-0000000c4400', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'kilitli-operator@example.test', '', now(), now());

insert into public.platform_operators (user_id, role, status)
values ('c4400000-0000-0000-0000-0000000c4400', 'owner', 'active');

insert into public.organizations (id, name, slug, code)
values ('6a000000-0000-0000-0000-00000000006a', 'Kurum A', 'kurum-a-v1211', 7901);

insert into public.branches (id, organization_id, name, is_default)
values ('6aa00000-0000-0000-0000-0000000006aa', '6a000000-0000-0000-0000-00000000006a', 'A Merkez', true);

insert into public.organization_memberships
  (id, organization_id, branch_id, user_id, role, status, person_code)
values
  ('d1100000-0000-0000-0000-0000000d1100', '6a000000-0000-0000-0000-00000000006a', '6aa00000-0000-0000-0000-0000000006aa',
   'c1100000-0000-0000-0000-0000000c1100', 'admin', 'active', 1000),
  ('d2200000-0000-0000-0000-0000000d2200', '6a000000-0000-0000-0000-00000000006a', '6aa00000-0000-0000-0000-0000000006aa',
   'c2200000-0000-0000-0000-0000000c2200', 'admin', 'active', 1001),
  ('d3300000-0000-0000-0000-0000000d3300', '6a000000-0000-0000-0000-00000000006a', '6aa00000-0000-0000-0000-0000000006aa',
   'c3300000-0000-0000-0000-0000000c3300', 'teacher', 'active', 1002);

insert into public.audit_events (organization_id, branch_id, action, entity_type)
values ('6a000000-0000-0000-0000-00000000006a', '6aa00000-0000-0000-0000-0000000006aa',
        'test.created', 'test');

insert into public.platform_audit_events (actor_user_id, action, entity_type)
values ('c4400000-0000-0000-0000-0000000c4400', 'platform.test', 'test');

-- Birinci yönetici ve operatör kilitli; ikinci yönetici açık.
update public.profiles set must_change_password = true
where id in ('c1100000-0000-0000-0000-0000000c1100', 'c4400000-0000-0000-0000-0000000c4400');

-- Kilitli yönetici: KİMLİK hâlâ açık ------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', 'c1100000-0000-0000-0000-0000000c1100', true);

select ok(
  public.current_user_must_change_password(),
  'the first admin really is locked — everything below depends on this'
);

select is(
  (select count(*) from public.profiles where id = 'c1100000-0000-0000-0000-0000000c1100'),
  1::bigint,
  'a locked user can still read their own profile — this is how they learn they are locked'
);

select is(
  (select must_change_password from public.profiles
     where id = 'c1100000-0000-0000-0000-0000000c1100'),
  true,
  'and the flag itself is readable, so the screen can say the right thing (K-09)'
);

select is(
  (select count(*) from public.organization_memberships
     where user_id = 'c1100000-0000-0000-0000-0000000c1100'),
  1::bigint,
  'a locked user can still read their own membership — identity resolution needs it'
);

select is(
  (select count(*) from public.organizations),
  1::bigint,
  'and their organization — the client reads it with .single(), so an empty result would throw'
);

select is(
  (select count(*) from public.branches),
  1::bigint,
  'and their branch, for the same reason'
);

-- Kilitli yönetici: İŞ VERİSİ kapalı --------------------------------------------------

select is(
  (select count(*) from public.audit_events),
  0::bigint,
  'a locked admin cannot read the institution audit log'
);

select is(
  (select count(*) from public.profiles),
  1::bigint,
  'a locked admin sees only their own profile — not the other members'
);

select is(
  (select count(*) from public.organization_memberships),
  1::bigint,
  'a locked admin sees only their own membership — not the member list'
);

-- Açık yönetici: aynı sorular, karşıt cevaplar ------------------------------------------
--
-- Bu blok olmadan yukarısı bir şey kanıtlamaz: her şeyi kilitleyen bir
-- migration da o testleri geçerdi.

select set_config('request.jwt.claim.sub', 'c2200000-0000-0000-0000-0000000c2200', true);

select ok(
  not public.current_user_must_change_password(),
  'the second admin is not locked — the contrast below is real'
);

select is(
  (select count(*) from public.audit_events),
  1::bigint,
  'an unlocked admin does read the audit log'
);

select is(
  (select count(*) from public.profiles),
  3::bigint,
  'an unlocked admin does read every member profile in their organization'
);

select is(
  (select count(*) from public.organization_memberships),
  3::bigint,
  'and the whole member list'
);

-- Kilitli platform operatörü ---------------------------------------------------------------

select set_config('request.jwt.claim.sub', 'c4400000-0000-0000-0000-0000000c4400', true);

select is(
  (select count(*) from public.platform_audit_events),
  0::bigint,
  'a locked operator cannot read the platform audit log'
);

select is(
  (select count(*) from public.organizations),
  0::bigint,
  'nor list the organizations — that is the panel, not identity'
);

select is(
  (select count(*) from public.profiles where id = 'c4400000-0000-0000-0000-0000000c4400'),
  1::bigint,
  'but the operator still reads their own profile, exactly like the admin'
);

-- Kilidin kapsamı bir daha sessizce kaymasın ------------------------------------------------
--
-- Bu iddia tek tek politikaları değil **kümenin kendisini** sabitliyor: kilit
-- koşulunu taşımayan politikalar tam olarak şu altı kimlik okumasıdır. Yeni bir
-- politika kilitsiz yazılırsa bu test kırmızıya döner ve yazarına "bu gerçekten
-- kimlik mi" diye sorar.
--
-- Kimlik olmayan bir okuma buraya eklenirse liste de güncellenmeli — ama o
-- güncelleme bilinçli bir hareket olur, unutkanlık değil.

reset role;

select is(
  (
    select coalesce(string_agg(c.relname || '.' || p.polname, ', ' order by c.relname, p.polname), '')
    from pg_policy as p
    join pg_class as c on c.oid = p.polrelid
    join pg_namespace as n on n.oid = c.relnamespace and n.nspname = 'public'
    where coalesce(pg_get_expr(p.polqual, p.polrelid), '')
       || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
          not like '%must_change_password%'
  ),
  'branches.branches_select_member, '
  || 'organization_memberships.memberships_select_self, '
  || 'organizations.organizations_select_member, '
  || 'platform_operators.platform_operators_select_operator, '
  || 'profiles.profiles_select_self, '
  || 'profiles.profiles_update_self',
  'exactly six policies skip the password lock, and every one of them is an identity read'
);

select * from finish();
rollback;
